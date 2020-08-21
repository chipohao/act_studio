var path = require('path')
var webpack = require('webpack')
var HtmlWebpackPlugin = require('html-webpack-plugin')


module.exports = {
	entry: {
		app: './src/index.js',
		adminApp: './src/admin.js'
	}, 
	output: {
		path: path.join(__dirname, 'dist'),
		filename: '[name].bundle.js',
		chunkFilename: '[id].bundle_[chunkhash].js',
	},
	externals: {
		"p5": "p5"
	},
	module: {
		rules: [{
			test: /\.js/,
			exclude: /(node_modules|bower_components)/,
			use: [{
				loader: 'babel-loader'
			}]
		},
		{
			test: /\.css/,
			use: ['style-loader', 'css-loader'],
		},
		{
			test: /\.(mp3|wav|ogg)$/,
			exclude: /(node_modules|bower_components)/,
			loader: 'file-loader?name=[name].[ext]'
		},{
			test: /\.(png|jpg)$/,
			loader: 'url-loader?limit=8192'
		}, 
		{
			test: /\.(png|jpg)$/,
			loader: 'image-webpack-loader'
		}]
	},
	plugins: [
		new webpack.optimize.OccurrenceOrderPlugin(),
		new HtmlWebpackPlugin({
			filename: 'index.html',
			chunks: ['app'],
			template: './index.html'
		}),
		new HtmlWebpackPlugin({
			filename: 'control.html',
			chunks: ['adminApp'],
			template: './control.html'
		})
	],
	optimization: {
		minimize: true
	}
}