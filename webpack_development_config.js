const path = require('path');

module.exports = {
    mode: 'development',
    devtool: 'eval-source-map',
    entry: ['./public/index.js', './public/firebase_config.js'],
    output: {
        path: path.resolve(__dirname, 'public'),
        filename: 'packed_index.js'
    }
};