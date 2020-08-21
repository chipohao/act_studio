import './loader.css';
import './style.css';

import ViewStep from '@zonesoundcreative/view-step';
import $ from 'jquery';
import Player, {PlayerUI} from '@zonesoundcreative/web-player';
import {freeTimeRef, lengthRef, connectRef, percentRef} from './firebase';
import emptySound from './sound/empty.wav';
import audioFile from './sound/A-2.mp3';

import io from 'socket.io-client';
import { socketServer } from './config';

//socket use
var socket = io(socketServer);
let isConnect = false;
let viewStep = new ViewStep('.step', 1, 3, {
    2: loading,
});
let first = true;
//firebase
let freeTime, length, percent = {};
let finish = 0;
let waitLoading = false;

//player
var emptyPlayer = new Player(emptySound, ()=>{console.log('loaded')});
let playerUI;
let player = new Player(audioFile, ()=>{
    console.log('yo', player.duration, player.loaded);
    playerUI.setMax(player.duration);
    finish++;
    if (waitLoading) intervalCheck();
    //player.play();
    console.log(player.player.buffer);
});

let changeState = (e) => {
    console.log('changeState', e);
    if (e.state == 'play') {
        socket.emit('play', {time:e.now});
        //player.play(parseInt(e.now));
    } else if (e.state == 'pause'){
        socket.emit('pause', {time:e.now});
        //player.pause();
    } else {
        if (first) {
            first = false;
            return;
        }
        console.log('restart');
        viewStep.showPrev();
        viewStep.showPrev();
        // if (playerUI) {
        //     socket.emit('play', {time:0});
        //     playerUI.play(0);
        //     player.play(0);
        // }
    }
};
playerUI = new PlayerUI('player', 'menuinner', null, {songname: 'test', second: true, range: true, usePlay: false, callback: changeState});
playerUI.inactiveStart();


//2: loading,

$('#start').click(function() {
    viewStep.showNext();
    console.log('start: loaded?', emptyPlayer.loaded);
    if (emptyPlayer.loaded) { //change to self player
        emptyPlayer.play();
    }
    socket.emit('ask', {});
})

function loading() {
    waitLoading = true;
    intervalCheck();
}

function intervalCheck() {
    if (!isConnect) {
        return;
    }
    if (finish == 0) {
        return;
    }
    waitLoading = false;
    viewStep.showNext();
}

//firebase read data here
percentRef.on('value', (pr) => {
    pr.forEach((e)=>{
        percent[e.key] = e.val();
        //console.log(e, e.key);
    });
    console.log('percent', percent);
});

connectRef.on('value', (cr) => {
    //calcConnect(cr);
});

function updateConnect(off){
    connectRef.child(playerid).transaction(function (current_value) {
        return (current_value || 0) + off;
    });
}


//socket here
socket.on('connect', (data) => {
    console.log('connect!');
    isConnect = true;
    if (waitLoading) intervalCheck();
    socket.on('play', (msg)=> {
        console.log('play', msg);
        //play(msg.time);
        playerUI.activeStart();
        player.play(parseInt(msg.time));
        playerUI.play(parseFloat(msg.time));
    });

    socket.on('pause', (msg)=> {
        console.log('pause');
        // playerUI.offsetTime = parseFloat(msg.time);
        // playerUI.startTime = Date.now();
        // playerUI.setRangewithAudio();
        
        playerUI.activeStart();
        player.pause();
        playerUI.pause();
        //pause();
    })

})