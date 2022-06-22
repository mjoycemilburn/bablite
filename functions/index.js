const functions = require('firebase-functions');
const firestore = require('@google-cloud/firestore');
const admin = require("firebase-admin");
admin.initializeApp();

const db = admin.firestore();
const client = new firestore.v1.FirestoreAdminClient();

// Replace BUCKET_NAME
const bucket = 'gs://bablite_backup_bucket';

exports.scheduledFirestoreExport = functions
    .region('europe-west3')
    .pubsub
    .schedule('00 16 * * 0') // Every Sunday at 4pm (but since the default timezone is America/LA, 8 hours behind UK GMT, this gives an effective runtime of midnight)
    .onRun((context) => {

        const projectId = process.env.GCP_PROJECT || process.env.GCLOUD_PROJECT;
        const databaseName =
            client.databasePath(projectId, '(default)');

        return client.exportDocuments({
            name: databaseName,
            outputUriPrefix: bucket,
            // Leave collectionIds empty to export all collections
            // or set to a list of collection IDs to export,
            // collectionIds: ['users', 'posts']
            collectionIds: ['textTypes', 'programmes', 'programmeTexts', 'userJotter', 'userNotes']
        })
            .then(async (responses) => {
                const response = responses[0];
                console.log(`Operation Name: ${response['name']}`);

                // now clear down the Logs

                const logsCollRef = db.collection("recoverableCollectionLogs");
                const logsSnapshot = await logsCollRef.get();
                logsSnapshot.forEach(async (logsDoc) => {
                    await logsDoc.ref.delete();
                });
            })
            .catch(err => {
                console.error(err);
                throw new Error('Export operation failed');
            });
    });