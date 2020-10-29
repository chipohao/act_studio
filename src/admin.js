import './loader.css';
import './style.css';

import ViewStep from '@zonesoundcreative/view-step';
import $ from 'jquery';
import Player, {PlayerUI} from '@zonesoundcreative/web-player';
import {freeTimeRef, lengthRef, connectRef, percentRef} from './firebase';
import emptySound from './sound/empty.wav';
import audioFile from './sound/chA.mp3';

import io from 'socket.io-client';
import { socketServer } from './config';
const numbers = ["中文 A", "中文 B", "中文 C", "台語 A", "台語 C", "英文 B"]

//socket use
var socket = io(socketServer);
let isConnect = false;
let viewStep = new ViewStep('.step', 1, 3, {
    2: loading,
});
let first = true;
//firebase
let freeTime, length, percent = {}, connect = {};
let totalConnect = 0;
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
let percentFirst = true;
percentRef.on('value', (pr) => {
    let html = "<br><h5>比例</h5>";
    pr.forEach((e)=>{
        if (e.key == 0) return;
        percent[e.key] = parseFloat(e.val());
        if (percentFirst) {
            html += `
            <label for="percent-${e.key}" style="margin-right: 20px;">${numbers[parseInt(e.key)-1]}</label>
            <input type="number" id="percent-${e.key}" value=${parseFloat(e.val())} step="0.01" min="0" max="1"></input><br>`;
        } else {
            $('#percent-'+e.key).val(parseFloat(e.val()));
        }
       
    });
    if (percentFirst) {
        $('#percent').html(html);
        for (let k in percent) {
            $('#percent-'+k).on('change', function() {
                console.log(k, $(this).val());
                updateDir(percentRef, k, $(this).val());
            });
            percentFirst = false;
        }
    }
    
    
    
});


connectRef.on('value', (cr) => {
    
    totalConnect = 0;
    cr.forEach((e)=>{
        if (e.key == 0) return;
        connect[e.key] = parseInt(e.val())-1;
        totalConnect += parseInt(e.val())-1;
    });
    setConnect();

    
});

function setConnect() {
    let html = `<h5>共 ${totalConnect} 人連線</h5>`;
    for (let k in connect) {
        
        html += `
        <span for="connect-${k}" style="margin-right: 20px;">${numbers[parseInt(k)-1]}: </label>
        <span id="connect-${k}">${connect[k]}人</input>
        <span style="margin-left:10px;">(${totalConnect == 0 ? totalConnect : connect[k]*100/totalConnect}%)</span>
        <br>`;
    }
    
    $('#connect').html(html);
}

$('#resetConnect').click(function() {
    updateDir(connectRef, 0, 1);
    for (let k in connect) {
        console.log('reset', k);
        connect[k] = 0;
        updateDir(connectRef, k, 1);
    }
})

function updateConnect(off){
    connectRef.child(playerid).transaction(function (current_value) {
        return (current_value || 0) + off;
    });
}

function updateDir(ref, child, num){
    ref.child(child).transaction(function (current_value) {
        return num;
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