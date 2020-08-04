import ViewStep from '@zonesoundcreative/view-step';
import $ from 'jquery';
import Player from '@zonesoundcreative/web-player';
import {freeTimeRef, connectRef, percentRef} from './firebase';
import NoSleep from 'nosleep.js';
import testSound from './test.mp3';
import emptySound from './sound/empty.aif';
import io from 'socket.io-client';
import { socketServer } from './config';

//socket use
var socket = io(socketServer);
let isConnect = false;

//firebase
let freeTime, length, connect = {}, percent = {};

//player
let playerid = 0;
let player = new Player(emptySound);
let playList = [testSound, testSound];
let players = [];
let freeTimeout = null;

//other
var noSleep = new NoSleep();
let viewStep = new ViewStep('.step', 1, 2, {
    2: initSoundList
});

for (let i=0; i<playList.length; i++) {
    players.push(new Player(playList[i]));
}

$('#start').click(function() {
   viewStep.showNext();
    if (player.loaded) { //change to self player
        player.play();
    }
})

$('.players').click(function() {
    noSleep.enable();
    if (playerid != 0) updateConnect(1); 
    playerid = $(this).attr('id').split('-')[1]
    playerStart();
    
})

function playerStart() {
    $('.players').attr('disabled', true);
    updateConnect(1);
    if (player.loaded && isConnect) { //change to self player
        console.log('asking......');
        socket.emit('ask', {});
    }
}

function play(time) {
    if (playerid <= 0) return;
    console.log(players[playerid-1], playerid, time);
    //player.play(time);
    players[playerid-1].play(time);
    if (time <= 30) {
        $('.players').attr('disabled', false);
        $('#player-'+playerid).attr('disabled', true);
    }
    //check for change 
    freeTimeout = setTimeout(stopFreeChange, (freeTime-time)*1000);
}

function pause() {
    if (playerid <= 0) return;
    console.log(players[playerid-1], playerid);
    players[playerid-1].pause();
    if (freeTimeout) {
        clearTimeout(freeTimeout);
        freeTimeout = null;
    }
}

function stopFreeChange() {
    $('.players').attr('disabled', true);
    freeTimeout = null;
    //set end timeout?
    /*
    noSleep.disable();
    console.log('end!');
    updateConnect(-1);
    playerid = 0;
    */
}


function initSoundList() {
    console.log('initSoundList', player.loaded);
    //connect to socket and 
    // ask socket which sound is available
}


//firebase read data here
freeTimeRef.on('value', (t)=> {
    freeTime = t.val();
})

percentRef.on('value', (pr) => {
    pr.forEach((e)=>{
        percent[e.key] = e.val();
        //console.log(e, e.key);
    });
    console.log('percent', percent);
});

connectRef.on('value', (cr) => {
    if (playerid == 0) return;
    let total = 0;
    cr.forEach((e)=>{
        total += e.val();
        connect[e.key] = e.val();
        //console.log(e, e.key);
    });
    if (total == 0) return;
    cr.forEach((e)=>{
        if (parseInt(e.val())/total > percent[e.key]) {
            console.log(e.key, true);
            $("#player-"+e.key).attr('disabled', true);
        } else {
            console.log(e.key, false);
            $("#player-"+e.key).attr('disabled', false);
        }
    })
});

function updateConnect(off){
    connectRef.child(playerid).transaction(function (current_value) {
        return (current_value || 0) + off;
    });
}


//window handling before unload
$(window).bind("beforeunload", function() { 
    if (playerid) updateConnect(-1);
    //return inFormOrLink ? "Do you really want to close?" : null; 
})

window.onbeforeunload = function () {
    return "Are you sure?";
}


//socket here
socket.on('connect', (data) => {
    console.log('connect!');
    isConnect = true;
    socket.on('play', (msg)=> {
        console.log('play', msg);
        play(msg.time);
    });

    socket.on('pause', (msg)=> {
        console.log('pause');
        pause();
    })

})