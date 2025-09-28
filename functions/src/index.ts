import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'

// Initialize Firebase Admin SDK
admin.initializeApp()

const db = admin.firestore()

/**
 * Clean up old party sessions (runs daily)
 */
export const cleanupOldSessions = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    const oneDayAgo = new Date()
    oneDayAgo.setDate(oneDayAgo.getDate() - 1)

    const oldSessions = await db
      .collection('party-sessions')
      .where('updatedAt', '<', oneDayAgo)
      .where('status', 'in', ['ended', 'paused'])
      .get()

    const batch = db.batch()
    oldSessions.docs.forEach(doc => {
      batch.delete(doc.ref)
    })

    await batch.commit()
    console.log(`Cleaned up ${oldSessions.docs.length} old sessions`)
  })

/**
 * Update vote counts when votes are added/removed
 */
export const updateVoteCounts = functions.firestore
  .document('party-sessions/{sessionId}/votes/{voteId}')
  .onWrite(async (change, context) => {
    const sessionId = context.params.sessionId
    const sessionRef = db.collection('party-sessions').doc(sessionId)

    // Get all votes for this session
    const votesSnapshot = await db
      .collection(`party-sessions/${sessionId}/votes`)
      .get()

    // Count votes per candidate
    const voteCounts: { [candidateId: string]: number } = {}
    votesSnapshot.docs.forEach(doc => {
      const candidateId = doc.data().candidateId
      voteCounts[candidateId] = (voteCounts[candidateId] || 0) + 1
    })

    // Update candidate vote counts
    const candidatesSnapshot = await db
      .collection(`party-sessions/${sessionId}/candidates`)
      .get()

    const batch = db.batch()
    candidatesSnapshot.docs.forEach(doc => {
      const candidateId = doc.id
      const newVoteCount = voteCounts[candidateId] || 0
      batch.update(doc.ref, { votes: newVoteCount })
    })

    // Update session stats
    const totalVotes = votesSnapshot.docs.length
    batch.update(sessionRef, {
      totalVotes,
      lastVoteUpdate: admin.firestore.FieldValue.serverTimestamp()
    })

    await batch.commit()
    console.log(`Updated vote counts for session ${sessionId}: ${totalVotes} total votes`)
  })

/**
 * Track session analytics
 */
export const trackSessionActivity = functions.firestore
  .document('party-sessions/{sessionId}')
  .onUpdate(async (change, context) => {
    const sessionId = context.params.sessionId
    const before = change.before.data()
    const after = change.after.data()

    // Log significant changes
    if (before.status !== after.status) {
      await db.collection('analytics').add({
        sessionId,
        event: 'status_change',
        from: before.status,
        to: after.status,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      })
    }

    if (before.currentVotingRound !== after.currentVotingRound) {
      await db.collection('analytics').add({
        sessionId,
        event: 'new_voting_round',
        round: after.currentVotingRound,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      })
    }
  })

/**
 * Generate party insights (can be called from frontend)
 */
export const generatePartyInsights = functions.https.onCall(async (data, context) => {
  const { sessionId } = data

  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated')
  }

  // Get session data
  const sessionDoc = await db.collection('party-sessions').doc(sessionId).get()
  if (!sessionDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Session not found')
  }

  const session = sessionDoc.data()
  
  // Get voting analytics
  const votesSnapshot = await db
    .collection(`party-sessions/${sessionId}/votes`)
    .get()

  const candidatesSnapshot = await db
    .collection(`party-sessions/${sessionId}/candidates`)
    .get()

  // Calculate insights
  const totalVotes = votesSnapshot.docs.length
  const totalCandidates = candidatesSnapshot.docs.length
  const avgVotesPerCandidate = totalCandidates > 0 ? totalVotes / totalCandidates : 0

  // Find most popular candidate
  let mostPopular = null
  let maxVotes = 0
  
  candidatesSnapshot.docs.forEach(doc => {
    const votes = doc.data().votes || 0
    if (votes > maxVotes) {
      maxVotes = votes
      mostPopular = {
        id: doc.id,
        ...doc.data()
      }
    }
  })

  return {
    sessionId,
    insights: {
      totalVotes,
      totalCandidates,
      avgVotesPerCandidate,
      mostPopular,
      participationRate: totalVotes > 0 ? (totalVotes / (session.maxParticipants || 50)) * 100 : 0
    }
  }
})

