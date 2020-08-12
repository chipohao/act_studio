var path = require('path')
var webpack = require('webpack')
var HtmlWebpackPlugin = require('html-webpack-plugin')


module.exports = {
	entry: ['./src/index.js'], 
	output: {
		path: path.join(__dirname, 'dist'),
		filename: '[name].bundle.js',
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
			test: /\.(mp3|wav|aif)$/,
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
		template: './index.html'
		})
	],
	optimization: {
		minimize: true
	}
}