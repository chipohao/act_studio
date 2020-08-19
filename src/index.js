import './loader.css';
import './style.css';

import ViewStep from '@zonesoundcreative/view-step';
import $ from 'jquery';
import Player from '@zonesoundcreative/web-player';
import {freeTimeRef, lengthRef, connectRef, percentRef} from './firebase';
import NoSleep from 'nosleep.js';
import emptySound from './sound/empty.wav';
import ballSound from './sound/ball.mp3';
import test from './sound/A-2.mp3';

import aTrack from './sound/A-2.mp3';
import bTrack from './sound/B-2.mp3';
import cTrack from './sound/C-2.mp3';
import io from 'socket.io-client';
import { socketServer } from './config';
import Tone from 'tone';
//import './style.js';
import queryString from 'query-string';



//socket use
var socket = io(socketServer);
let isConnect = false;

//firebase
let freeTime, length, percent = {};
let conDisable = [];

//player
let playerid = 0;
const player = new Player(emptySound, ()=>{console.log('loaded')});
const player2 = new Player(test, ()=>{console.log('loaded2')});

//const player = new Tone.Player(ballSound).toMaster();
var playList = [aTrack, bTrack, cTrack];
//var player;
var players = [];
let change = true;
let freeTimeout = null;
let endTimeout = null;
let page;
//other
var noSleep = new NoSleep();
let viewStep = new ViewStep('.step', 2, 3, {
     2: loading,
});
let finish = 0;
let waitLoading = false;
//2: loading,

initPage();
function initPage() {
    const parsed = queryString.parse(location.search);
    if (parsed.page) page = parseInt(parsed.page);
    if (page > playList.length) page = undefined;
    Promise.all(Array.from(document.images).filter(img => !img.complete).map(img => new Promise(resolve => { img.onload = img.onerror = resolve; }))).then(() => {
        console.log('images finished loading');
        viewStep.showPrev();
    });

    //init page
    if (page) {
        players.push(new Player(playList[page-1], ()=>{
            console.log('player num'+(page-1)+'loaded');
            finish ++;
            if (waitLoading) intervalCheck();
        }));
        $("#menuinner").append(`<button id="player-${page}" type="button" class="btn btn-block btn-dark players">音軌</button>
            `);
    } else {
        for (let i=0; i<playList.length; i++) {
            const a = new Player(playList[i], ()=>{
                console.log('player num'+i+'loaded');
                finish ++;
                if (waitLoading) intervalCheck();
            });
            players.push(a);
            $("#menuinner").append(`<button id="player-${i+1}" type="button" class="btn btn-block btn-dark players">${String.fromCharCode('A'.charCodeAt(0)+i)} 軌</button>
            `);
            conDisable.push(true);
        }
    }
    
}

$('#start').click(function() {
    viewStep.showNext();
    console.log('start: loaded?', player.loaded);
    if (player.loaded) { //change to self player
        player.play();
    }
})

$('.players').click(function() {
    //player.start();
    noSleep.enable();
    if (playerid != 0) { // playing
        players[playerid-1].pause();
        if (!page) updateConnect(-1); 
    }
    playerid = parseInt($(this).attr('id').split('-')[1]);
    $('.players').attr('disabled', true);
    if (!page) updateConnect(1);
    socket.emit('ask', {});
})

function play(time) {
    
    if (playerid <= 0) return;
    //player.play();
    if (page) players[0].play(time);
    else {
        //console.log('play'+playerid);
        //player2.play(time);
        players[playerid-1].play(time);
    }
    if (freeTimeout) {
        clearTimeout(freeTimeout);
        freeTimeout = null;
    }
    if (endTimeout) {
        clearTimeout(endTimeout);
        endTimeout = null;
    }

    if (time <= freeTime) {
        change = true;
        soundChangeable();
        //check for change 
        freeTimeout = setTimeout(stopFreeChange, (freeTime-time)*1000);
    } else {
        change = false;
        $('.players').attr('disabled', true);
    }
    endTimeout = setTimeout(reachEnd, (length-time)*1000);

}

function pause() {
    if (playerid <= 0) return;
    change = true;
    if (page) players[0].pause();
    else players[playerid-1].pause();

    if (freeTimeout) {
        clearTimeout(freeTimeout);
        freeTimeout = null;
    }
    if (endTimeout) {
        clearTimeout(endTimeout);
        endTimeout = null;
    }
    soundChangeable();
}

function soundChangeable() {
    for (let i=0; i<conDisable.length; i++) {
        //console.log(i, conDisable[i]);
        $('#player-'+(i+1)).attr('disabled', conDisable[i]);
    }
    //console.log(playerid, true);
    $('#player-'+playerid).attr('disabled', true);
}

function stopFreeChange() {
    change = false;
    console.log('stopFree!');
    $('.players').attr('disabled', true);
    freeTimeout = null;
}

function reachEnd() {
    change = true;
    $('.players').attr('disabled', false);
    //console.log('end!');
    noSleep.disable();
    if(!page) updateConnect(-1);
    playerid = 0;
    endTimeout = null;
    player.pause();
    viewStep.showPrev();
    viewStep.showPrev(true, true);
}

function loading() {
    waitLoading = true;
    //initSoundList();
    intervalCheck();
}

function intervalCheck() {
    if (!isConnect) {
        //setTimeout(intervalCheck, 500);
        return;
    }
    if (page) {
        if (finish < 1) return;
        // if (!players[0].loaded) {
        //     setTimeout(intervalCheck, 500);
        //     return;
        // }
    } else {
        if (finish < players.length) return;
        // for (let i=0; i<players.length; i++) {
        //     if (!players[i].loaded) {
        //         setTimeout(intervalCheck, 500);
        //         return;
        //     }
        // }
    }
    waitLoading = false;
    viewStep.showNext();
}

//firebase read data here
freeTimeRef.on('value', (t)=> {
    freeTime = t.val();
})

lengthRef.on('value', (t)=> {
    length = t.val();
})

percentRef.on('value', (pr) => {
    pr.forEach((e)=>{
        percent[e.key] = e.val();
        //console.log(e, e.key);
    });
    //console.log('percent', percent);
});

function calcConnect(cr) {
    let total = 0;
    cr.forEach((e)=>{
        if (e.key == 0) return;
        total += e.val();
    });
    if (total == 0) return;
    cr.forEach((e)=>{
        if (parseInt(e.val())/total > percent[e.key]) {
            //console.log(e.key, true);
            conDisable[e.key-1] = true;
            $("#player-"+e.key).attr('disabled', true);
        } else {
            //console.log(e.key, false);
            conDisable[e.key-1] = false;
            if (change && (playerid != e.key)) $("#player-"+e.key).attr('disabled', false);
        }
    })
}

connectRef.on('value', (cr) => {
    if (page) return;
    calcConnect(cr);
});

function updateConnect(off){
    connectRef.child(playerid).transaction(function (current_value) {
        return (current_value || 0) + off;
    });
}


//window handling before unload
$(window).bind("beforeunload", function() { 
    if (playerid && !page) updateConnect(-1);
    //return inFormOrLink ? "Do you really want to close?" : null; 
})

window.onbeforeunload = function () {
    return "Are you sure?";
}


//socket here
socket.on('connect', (data) => {
    //console.log('connect!');
    isConnect = true;
    if (waitLoading) intervalCheck();
    socket.on('play', (msg)=> {
        //console.log('play', msg);
        play(parseFloat(msg.time));
    });

    socket.on('pause', (msg)=> {
        //console.log('pause');
        pause();
    })

})