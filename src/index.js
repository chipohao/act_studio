import './loader.css';
import './style.css';
import $ from 'jquery';
import ViewStep from '@zonesoundcreative/view-step';
import Player from '@zonesoundcreative/web-player';
import {freeTimeRef, lengthRef, connectRef, percentRef} from './firebase';
import NoSleep from 'nosleep.js';
import emptySound from './sound/empty.wav';
import aTrack from './sound/A-2.mp3';
import bTrack from './sound/B-2.mp3';
import cTrack from './sound/C-2.mp3';
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
var playList = [aTrack, bTrack, cTrack];
var players = [];
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

    //init page
    if (page) {
        players.push(new Player(playList[page-1], ()=>{
            console.log('player num'+(page-1)+'loaded');
            finish ++;
            if (waitLoading) intervalCheck();
        }));
        $("#menuinner").append(`
        <button id="player-${page}" type="button" class="btn btn-block btn-dark players">${trackText(page)}</button>
            `);
    } else {
        for (let i=0; i<playList.length; i++) {
            const a = new Player(playList[i], ()=>{
                console.log('player num'+i+'loaded');
                finish ++;
                if (waitLoading) intervalCheck();
            });
            players.push(a);
            $("#menuinner").append(`
            <button id="player-${i+1}" type="button" class="btn btn-block btn-dark players">${trackText(i+1)}</button>
            `);
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
        freeTimeout = setTimeout(pageOut, (freeTime-time)*1000);
    }
    endTimeout = setTimeout(reachEnd, (length-time)*1000);
    
}

function pause() {
    if (playerid <= 0) return;
    let text = `<span class="playing">等待全員到齊中</span>`;
    $("#player-"+playerid).html(text);
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
}

function pageOut() {
    viewStep.showPrev();
    viewStep.showPrev(true, true);
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
    noSleep.disable();
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
    return String.fromCharCode('A'.charCodeAt(0)+i-1) + " 軌";
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
