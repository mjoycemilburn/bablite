const { firebase } = require('googleapis/build/src/apis/firebase');
const path = require('path');

module.exports = {
    mode: 'production',
    entry: ['./public/index.js', './public/firebase_config.js'],
    output: {
        path: path.resolve(__dirname, 'public'),
        filename: 'packed_index.js'
    }
};