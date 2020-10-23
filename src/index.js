//import './loader.css';
import './style.css';
import $ from 'jquery';
import ViewStep from '@zonesoundcreative/view-step';
import Player from '@zonesoundcreative/web-player';
import {freeTimeRef, lengthRef, connectRef, percentRef} from './firebase';
import NoSleep from 'nosleep.js';
import emptySound from './sound/empty.wav';
//import aTrack from './sound/A-2.mp3';
import chaTrack1 from './sound/chA-1-2.mp3';
import chaTrack2 from './sound/chA-2-2.mp3';
//import bTrack from './sound/B-2.mp3';
import chbTrack1 from './sound/chB-1-2.mp3';
import chbTrack2 from './sound/chB-2-2.mp3';
//import cTrack from './sound/C-2.mp3';
import chcTrack1 from './sound/chC-1-2.mp3';
import chcTrack2 from './sound/chC-2-2.mp3';

import enbTrack1 from './sound/enB-1-2.mp3';
import enbTrack2 from './sound/enB-2-2.mp3';

import taTrack1 from './sound/tA-1-2.mp3';
import taTrack2 from './sound/tA-2-2.mp3';
//import bTrack from './sound/B-2.mp3';
import tbTrack1 from './sound/tB-1-2.mp3';
import tbTrack2 from './sound/tB-2-2.mp3';

import io from 'socket.io-client';
import { socketServer } from './config';
import queryString from 'query-string';

//socket use
var socket = io(socketServer);
let isConnect = false;

//firebase
let freeTime, length, percent = {};

//player
let playerid = 0;
const player = new Player(emptySound, ()=>{console.log('loaded')});
var playList = [[chaTrack1, chaTrack2], [chbTrack1, chbTrack2], [chcTrack1, chcTrack2], [taTrack1, taTrack2], [tbTrack1, tbTrack2], [enbTrack1, enbTrack2]];
//var playList = [aTrack1, aTrack2, bTrack1, bTrack2, cTrack1, cTrack2];
var players = [];
let freeTimeout = null;
let endTimeout = null;
let changeTrackTimout = null;
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
    let parsed = queryString.parse(location.search);
    if (parsed.page) {
        page = parseInt(parsed.page);
        if (page > playList.length) page = undefined;
    }
    //viewStep.showPrev();
    Promise.all(Array.from(document.images).filter(img => !img.complete).map(img => new Promise(resolve => {img.onload = img.onerror = resolve; }))).then(() => {
        console.log('images finished loading');
        viewStep.showPrev();
    });
    console.log('init page', page);
    //init page
    if (page) {
        console.log(page, 'page');
        players.push(loadPlayer(page-1));
    } else {
        for (let i=0; i<playList.length; i++) {
            players.push(loadPlayer(i));
        }
    }
    console.log(players);
}

function loadPlayer(i) {
    var a;
    if (Array.isArray(playList[i])) {
        a = [
            new Player(playList[i][0], ()=>{
                console.log('player num'+i+'loaded-1');
                finish += 0.5;
                if (waitLoading) intervalCheck();
            }),
            new Player(playList[i][1], ()=>{
                console.log('player num'+i+'loaded-2');
                finish += 0.5;
                if (waitLoading) intervalCheck();
            })
        ]
    }
    else {
        a = new Player(playList[i], ()=>{
            console.log('player num'+i+'loaded');
            finish ++;
            if (waitLoading) intervalCheck();
        });
    } 
    $("#menuinner").append(`
    <button id="player-${i+1}" type="button" class="btn btn-block btn-dark players">${trackText(i+1)}</button>
    `);
    return a;
}

$('#start').on('click', function() {
    viewStep.showNext();
    noSleep.enable();
    console.log('start: loaded?', player.loaded);
    if (player.loaded) { //change to self player
        player.play();
    }
})

$('.players').on('click', function() {
    //player.start();
    
    if (playerid != 0) { // playing
        if (Array.isArray(players[playerid-1])) {
            players[playerid-1][0].pause();
            players[playerid-1][1].pause();
        } else {
            players[playerid-1].pause();
        }
        
        if (!page) updateConnect(-1); 
        $("#player-"+playerid).html(trackText(playerid));
    }
    playerid = parseInt($(this).attr('id').split('-')[1]);
    $('.players').attr('disabled', true);

    if (!page) updateConnect(1);
    socket.emit('ask', {});
})

function play(time) {
    
    if (playerid <= 0) return;
    //player.play();
    //console.log('change text: playing');
    let text = `<span class="playing">播放中</span>`;
    $("#player-"+playerid).html(text);
    if (changeTrackTimout) clearTimeout(changeTrackTimout);
    // if (page) players[0].play(time);
    // else {
    let playNum = page ? 0 : playerid-1;
    if (Array.isArray(players[playNum])) {
        if (time < 210) {
            players[playNum][1].pause();
            players[playNum][0].play(time);
            changeTrackTimout = setTimeout(()=>{
                players[playNum][0].pause();
                players[playNum][1].play(0);
            }, (210-time)*1000);
        } 
        else {
            players[playNum][0].pause();
            players[playNum][1].play(time-210);
        }
            
    } else {
        players[playNum].play(time);
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
        freeTimeout = setTimeout(pageOut, (freeTime-time)*1000);
    }
    endTimeout = setTimeout(reachEnd, (length-time)*1000);
    
}

function pause() {
    if (playerid <= 0) return;
    let text = `<span class="playing">等待全員到齊中</span>`;
    $("#player-"+playerid).html(text);
    let playNum = page ? 0 : playerid-1;

    if (Array.isArray(players[playNum])) {
        players[playNum][0].pause();
        players[playNum][1].pause();
    } else {
        players[playNum].pause();
    }
    
    if (changeTrackTimout) {
        clearTimeout(changeTrackTimout);
        changeTrackTimout = null;
    }

    if (freeTimeout) {
        clearTimeout(freeTimeout);
        freeTimeout = null;
    }
    if (endTimeout) {
        clearTimeout(endTimeout);
        endTimeout = null;
    }    
}

function pageOut() {
    viewStep.showPrev();
    viewStep.showPrev(true, true);
    noSleep.disable();
    $('.players').attr('disabled', false);
    $('#player-'+playerid).html(trackText(playerid));
    if(!page) updateConnect(-1);
    playerid = 0;
}

function reachEnd() {
    // $('.players').attr('disabled', false);
    // console.log($('#player-'+playerid));
    // $('#player-'+playerid).html(trackText(playerid));
    //console.log('end!');
    
    endTimeout = null;
    if (playerid != 0){
        socket.emit('ask', {});
    }
}

function loading() {
    //viewStep.showNext();
    intervalCheck();
}

function intervalCheck() {
    waitLoading = false;
    if (!isConnect) {
        //alert('isConnect'); 
        waitLoading = true;
        return;
    }
    if (page && finish < 1) {
        //alert('page');
        waitLoading = true;
        return;
    }
    if ((page==undefined) && finish < players.length) {
        //alert('all');
        waitLoading = true;
        return;
    }
    //alert('ya');
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
            $("#player-"+e.key).attr('disabled', true);
            if (playerid != e.key) {
                let text = `<span class="full">額滿</span>`;
                $("#player-"+e.key).html(text);
            }
        } else {
            //console.log(e.key, false);
            if (playerid != e.key) {
                $("#player-"+e.key).attr('disabled', false);
                $("#player-"+e.key).html(trackText(parseInt(e.key)));
            }
        }
    })
}

function trackText(i){
    let lang = "";
    if (i < 4) {
        lang = "中文 ";
    } else if (i < 6) {
        lang = "台語 ";
        i -= 3;
    } else {
        lang = "English ";
        i = 2;
    }
    return lang + String.fromCharCode('A'.charCodeAt(0)+i-1);
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
    beforeLeave();
    //return inFormOrLink ? "Do you really want to close?" : null; 
})

window.onbeforeunload = function () {
    beforeLeave();
}

function beforeLeave() {
    
    if (playerid && !page) updateConnect(-1);
    if (freeTimeout) clearTimeout(freeTimeout);
    if (endTimeout) clearTimeout(endTimeout);
    if (isConnect) socket.disconnect();
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
