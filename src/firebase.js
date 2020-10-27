//import * as firebase from 'firebase';
import firebase from 'firebase/app';
import 'firebase/database';
import {firebaseConfig} from './config';

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const databaseRef = firebase.database().ref();
export const freeTimeRef = databaseRef.child('freeTime');
export const lengthRef = databaseRef.child('length');
export const connectRef = databaseRef.child('connect');
export const percentRef = databaseRef.child('percent');