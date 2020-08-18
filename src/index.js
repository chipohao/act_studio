import './loader.css';
import './style.css';

import ViewStep from '@zonesoundcreative/view-step';
import $ from 'jquery';
import Player from '@zonesoundcreative/web-player';
import {freeTimeRef, lengthRef, connectRef, percentRef} from './firebase';
import NoSleep from 'nosleep.js';
import emptySound from './sound/empty.wav';
import aTrack from './sound/A.wav';
import bTrack from './sound/B.wav';
import cTrack from './sound/C.wav';
import io from 'socket.io-client';
import { socketServer } from './config';

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
var player = new Player(emptySound, ()=>{console.log('loaded')});
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
//2: loading,

initPage();
function initPage() {
    const parsed = queryString.parse(location.search);
    page = parseInt(parsed.page);
    if (page > playList.length) page = undefined;
    Promise.all(Array.from(document.images).filter(img => !img.complete).map(img => new Promise(resolve => { img.onload = img.onerror = resolve; }))).then(() => {
        console.log('images finished loading');
        viewStep.showPrev();
    });

    //init page
    if (page) {
        players.push(new Player(playList[page-1], ()=>{console.log('player num'+(page-1)+'loaded')}));
        $("#menuinner").append(`<button id="player-${page}" type="button" class="btn btn-block btn-dark players">音軌</button>
            `);
    } else {
        for (let i=0; i<playList.length; i++) {
            players.push(new Player(playList[i], ()=>{console.log('player num'+i+'loaded')}));
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
    console.log('play!', player);
    noSleep.enable();
    if (playerid != 0) { // playing
        players[playerid-1].pause();
        if (!page) updateConnect(-1); 
    }
    playerid = $(this).attr('id').split('-')[1];
    $('.players').attr('disabled', true);
    if (!page) updateConnect(1);
    socket.emit('ask', {});
})

function play(time) {
    
    if (playerid <= 0) return;

    if (page) players[0].play(time);
    else players[playerid-1].play(time);

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
        $('#player-'+(i+1)).attr('disabled', conDisable[i]);
    }
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
    console.log('end!');
    noSleep.disable();
    if(!page) updateConnect(-1);
    playerid = 0;
    endTimeout = null;
    player.pause();
    viewStep.showPrev();
    viewStep.showPrev(true, true);
}

function loading() {
    //initSoundList();
    intervalCheck();
}

function intervalCheck() {
    if (!isConnect) {
        setTimeout(intervalCheck, 500);
        return;
    }
    for (let i=0; i<players.length; i++) {
        if (!players[i].loaded) {
            setTimeout(intervalCheck, 500);
            return;
        }
    }
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
    console.log('percent', percent);
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
            console.log(e.key, true);
            conDisable[e.key-1] = true;
            if (change) $("#player-"+e.key).attr('disabled', true);
        } else {
            console.log(e.key, false);
            conDisable[e.key-1] = false;
            if (change && playerid != e.key) $("#player-"+e.key).attr('disabled', false);
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