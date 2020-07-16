import * as firebase from 'firebase';
import {firebaseConfig} from './config';

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const databaseRef = firebase.database().ref();
export const enableRef = databaseRef.child('enable');
export const startTimeRef = databaseRef.child('startTime');
export const intervalRef = databaseRef.child('interval');
export const lengthRef = databaseRef.child('length');
export const connectRef = databaseRef.child('connect');
export const percentRef = databaseRef.child('percent');