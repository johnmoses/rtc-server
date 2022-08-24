document.querySelector('#room-name-input').focus();
document.querySelector('#room-name-input').onkeyup = function(e) {
    if (e.keyCode === 13) {
        document.querySelector('#join-submit').click();
    }
};

document.querySelector('#join-submit').onclick = function(e) {
    var roomName = document.querySelector('#room-name-input').value;
    var userName = document.querySelector('#user-name-input').value;
    window.location.href = `/room.html?roomName=${roomName}&userName=${userName}`;
}