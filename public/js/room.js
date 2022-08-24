'use strict';

const leaveButton = document.querySelector('#leave-button');
const videoPanel = document.querySelector('#video-panel');
const audioToggleButton = document.querySelector('#audio-toggle-button');
const videoToggleButton = document.querySelector('#video-toggle-button');
const boardToggleButton = document.querySelector('#board-toggle-button');
const messageInput = document.querySelector('#message-input');
const messageSendButton = document.querySelector('#message-send-button');
const chatMessages = document.querySelector('.chat-messages');

let videoAllowed = 1;
let audioAllowed = 1;
let micInfo = {};
let videoInfo = {};
let videoTrackReceived = {};
let connections = {};
let connectionName = {};
let audioTractSent = {};
let videoTractSent = {};
let myStream;
let myScreenShare;
let peerConnection;

const mediaConstraints = {
    'audio': true,
    'video': true,
}

const mediaConfig = {
    iceServers: [{
        urls: 'turn: ' + 'localhost',
        username: 'webrtc',
        credential: 'turnserver',
    }]
}

const mediaConfig1 = {
    iceServers: [{
        urls: "stun:stun.stunprotocol.org"
    }]
}

const roomName = params.get('roomName');
const userName = params.get('userName');
console.log('room: ', roomName + ' user: ' + userName);

const socket = io();

function connect() {
    getMedia();
    socket.emit('join room', roomName, userName);
}

socket.on('user count', count => {
    if (count > 1) {
        videoPanel.className = 'single-video';
    } else {
        videoPanel.className = 'conference-video';
    }
})

socket.on('message', (msg, sendername, time))

socket.on('action', (msg, sid) => {
    if (msg == 'mute') {
        console.log(sid + ' mutted');
    }
    else if (msg == 'unmute') {
        console.log(sid + ' unmutted');
    }
    else if (msg == 'videooff') {
        console.log(sid + ' switched video off');
    }
    else if (msg == 'videoon') {
        console.log(sid + ' switched video on');
    }
})

// Listener for message input
messageInput.addEventListener('keyup', function(e) {
    if(e.keyCode == 13) {
        e.preventDefault();
        messageSendButton.click();
    }
})

boardToggleButton.onclick = () => {
    console.log('toggled board');
    var videoPanel = document.getElementById('video-panel');
    var canvasPanel = document.getElementById('canvas-panel');
    if(videoPanel.style.display === 'none') {
        videoPanel.style.display = 'block';
        canvasPanel.style.display = 'none';
    } else {
        videoPanel.style.display = 'none';
        canvasPanel.style.display = 'block';
    }
}

// Hang up and leave
leaveButton.onclick = () => {
    hangUp()
}

// Send message
messageSendButton.onclick = () => {
    var message = messageInput.value;
    sendSignal('chat',{
        'user': userName,
        'message': message,
    })
    messageInput.value = '';
    // console.log('Chat message: ', message);
}

function sendNotification(msg) {
    meetingSocket.send(JSON.stringify({
        'notification': msg,
    }))
    messageInput.value = '';
    // console.log('Sending: ', msg);
}

function sendCanvas() {
    sendSignal('canvas',{
        'user': userName,
        'message': cvs.toDataURL()
    })
}

function sendSignal(action, message) {
    var jsonString = JSON.stringify({
        'user': userName,
        'action': action, 
        'message': message,
    })
    meetingSocket.send(jsonString);
    // console.log(userName + ', ' + action + ', ' + message)
}

function save() {
    // console.log('saving...');
    var fileName = document.getElementById('filename').value;
}

function getMedia() {
    navigator.mediaDevices.getUserMedia(mediaConstraints)
    .then(stream => {
        localStream = stream;
        // console.log('Got MediaStream: ', stream);

        // var mediaTracks = stream.getTracks();
        // for (let i=0; i < mediaTracks.length; i++) {
        //     console.log('mediaTracks: ', mediaTracks[i]);
        // }

        localVideo.srcObject = localStream;
        localVideo.muted = true;

        // Browser console variable
        window.stream = stream;

        // Define audio and video
        var audioTracks = stream.getAudioTracks();
        var videoTracks = stream.getVideoTracks();

        // Enable audio and video by default
        audioTracks[0].enabled = true;
        videoTracks[0].enabled = true;

        // Toggle audio
        audioToggleButton.onclick = function() {
            audioTracks[0].enabled = !audioTracks[0].enabled;
            if(audioTracks[0].enabled) {
                audioToggleButton.innerHTML = 'Audio Off';
                console.log('Audio Off');
                return;
            }
            audioToggleButton.innerHTML = 'Audio On';
            console.log('Audio On');
        };

        // Toggle video
        videoToggleButton.onclick = function() {
            videoTracks[0].enabled = !videoTracks[0].enabled;
            if(videoTracks[0].enabled) {
                videoToggleButton.innerHTML = 'Video Off';
                console.log('Video Off');
                return;
            }
            videoToggleButton.innerHTML = 'Video On';
            console.log('Video On');
        };
    })
    .catch(handleUserMediaError);
}

function selectSideBarTab(tabIndex) {
    // hide all
    document.getElementById('sidebar-tab1-content').style.display='none';
    document.getElementById('sidebar-tab2-content').style.display='none';
    // show selected
    document.getElementById('sidebar-tab' + tabIndex + '-content').style.display='block';
}

function handleUserMediaError(e) {
    console.log('User media error');
}

function reportError(e) {
    console.log(e);
    return;
}

function startCall() {
    navigator.mediaDevices.getUserMedia(mediaConstraints)
        .then(localStream => {
            myvideo.srcObject = localStream;
            myvideo.muted = true;

            localStream.getTracks().forEach(track => {
                for (let key in connections) {
                    connections[key].addTrack(track, localStream);
                    if (track.kind === 'audio')
                        audioTrackSent[key] = track;
                    else
                        videoTrackSent[key] = track;
                }
            })

        })
        .catch(e=> {
            console.log('Error accessing media devices. ',e);
        })
}

// Handle new offers
function handlePeerOffer(offer, sid, conname, micinfo, videoinfo) {
    connectionName[sid] = conname;
    console.log('video offered recevied');
    micInfo[sid] = micinfo;
    videoInfo[sid] = videoinfo;
    connections[sid] = new RTCPeerConnection(configuration);

    connections[sid].onicecandidate = function (event) {
        if (event.candidate) {
            console.log('icecandidate fired');
            socket.emit('new icecandidate', event.candidate, sid);
        }
    };

    connections[sid].ontrack = function (event) {

        if (!document.getElementById(sid)) {
            console.log('track event fired')
            let vidCont = document.createElement('div');
            let newvideo = document.createElement('video');
            let name = document.createElement('div');
            let muteIcon = document.createElement('div');
            let videoOff = document.createElement('div');
            videoOff.classList.add('video-off');
            muteIcon.classList.add('mute-icon');
            name.classList.add('nametag');
            name.innerHTML = `${cName[sid]}`;
            vidCont.id = sid;
            muteIcon.id = `mute${sid}`;
            videoOff.id = `vidoff${sid}`;
            muteIcon.innerHTML = `<i class="fas fa-microphone-slash"></i>`;
            videoOff.innerHTML = 'Video Off'
            vidCont.classList.add('video-box');
            newvideo.classList.add('video-frame');
            newvideo.autoplay = true;
            newvideo.playsinline = true;
            newvideo.id = `video${sid}`;
            newvideo.srcObject = event.streams[0];

            if (micInfo[sid] == 'on')
                muteIcon.style.visibility = 'hidden';
            else
                muteIcon.style.visibility = 'visible';

            if (videoInfo[sid] == 'on')
                videoOff.style.visibility = 'hidden';
            else
                videoOff.style.visibility = 'visible';

            vidCont.appendChild(newvideo);
            vidCont.appendChild(name);
            vidCont.appendChild(muteIcon);
            vidCont.appendChild(videoOff);

            videoPanel.appendChild(vidCont);

        }


    };

    connections[sid].onremovetrack = function (event) {
        if (document.getElementById(sid)) {
            document.getElementById(sid).remove();
            console.log('removed a track');
        }
    };

    connections[sid].onnegotiationneeded = function () {

        connections[sid].createOffer()
            .then(function (offer) {
                return connections[sid].setLocalDescription(offer);
            })
            .then(function () {

                socket.emit('video-offer', connections[sid].localDescription, sid);

            })
            .catch(reportError);
    };

    let desc = new RTCSessionDescription(offer);

    connections[sid].setRemoteDescription(desc)
        .then(() => { return navigator.mediaDevices.getUserMedia(mediaConstraints) })
        .then((localStream) => {

            localStream.getTracks().forEach(track => {
                connections[sid].addTrack(track, localStream);
                console.log('added local stream to peer')
                if (track.kind === 'audio') {
                    audioTrackSent[sid] = track;
                    if (!audioAllowed)
                        audioTrackSent[sid].enabled = false;
                }
                else {
                    videoTrackSent[sid] = track;
                    if (!videoAllowed)
                        videoTrackSent[sid].enabled = false
                }
            })

        })
        .then(() => {
            return connections[sid].createAnswer();
        })
        .then(answer => {
            return connections[sid].setLocalDescription(answer);
        })
        .then(() => {
            socket.emit('video-answer', connections[sid].localDescription, sid);
        })
        .catch(handleGetUserMediaError);

}

// Handle new answers
async function handlePeerAnswer(offer, peerUserName, receiver_channel_name) {
    // console.log('Sending answer ');
    var peer = new RTCPeerConnection(null);

    addLocalTracks(peer);

    var remoteVideo = createVideo(peerUserName);
    setOnTrack(peer, remoteVideo);

    var dataChannel = peer.createDataChannel('channel');
    peer.addEventListener('datachannel', e => {
        peer.dataChannel = e.channel;
        peer.dataChannel.addEventListener('open',()=>{
            console.log('Connection open');
        })
        peer.dataChannel.addEventListener('message',dataChannelOnMessage);
        peers[peerUserName] = [peer, dataChannel]
    })

    peer.addEventListener('iceconnectionstatechange',()=>{
        var iceConnectionState = peer.iceConnectionState;
        if (iceConnectionState === 'failed' || iceConnectionState === 'disconnected' || iceConnectionState === 'closed') {
            delete peers[peerUserName];
            if (iceConnectionState != 'closed') {
                peer.close();
            }
            removeVideo(remoteVideo);
        }
    })

    peer.addEventListener('icecandidate', (e=>{
        if(e.candidate) {
            console.log('New ICE Candidate: ', JSON.stringify(peer.localDescription));
            console.log('Waiting...')
            return;
        }
        sendSignal('video-answer', {
            'sdp': peer.localDescription,
            'receiver_channel_name': receiver_channel_name,
        })
    }))

    peer.setRemoteDescription(offer)
    .then(()=>{
        console.log('Remote description set!');
        return peer.createAnswer();
    })
    .then(a=>{
        console.log('answer created');
        peer.setLocalDescription(a);
    })
    .catch(e => {
        console.log('Error creating answer: ', e);
    });
    return peer;
}

function addLocalTracks(peer) {
    console.log('Adding local tracks');
    localStream.getTracks().forEach(track =>{
        peer.addTrack(track, localStream);
    })
    return;
}

function createVideo(peerUserName) {
    console.log('Creating video');
    var remoteVideoContainer = document.getElementById('sidebar-tab1-content');
    var remoteVideo = document.createElement('video');
    remoteVideo.id = peerUserName + '-video';
    remoteVideo.autoplay = true;
    remoteVideo.playsInline = true;

    var videoWrapper = document.createElement('div');
    videoWrapper.classList.add('flex-object');
    videoWrapper.appendChild(remoteVideo);
    remoteVideoContainer.appendChild(videoWrapper);

    return remoteVideo;
}

function setOnTrack(peer, remoteVideo) {
    var remoteStream = new MediaStream();
    remoteVideo.srcObject = remoteStream;
    peer.addEventListener('track', async(e)=>{
        remoteStream.addTrack(e.track, remoteStream);
    });
}

function removeVideo(video) {
    var videoWrapper = video.parentNode;
    videoWrapper.parentNode.removeChild(videoWrapper);
    console.log('Removing video...');
}

function hangUp() {
    console.log('Hanging up...');
    window.location.href = '/';
}