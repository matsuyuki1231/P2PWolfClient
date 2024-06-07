<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <link rel="stylesheet" href="css/style.css">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=M+PLUS+1:wght@200;500;700;900&family=Roboto:wght@400;700&family=Yomogi&display=swap" rel="stylesheet">
    <link rel="manifest" href="manifest.json">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>YMGS Sync Communicator</title>
<?php
if (isset($_GET["serverId"])) {
    setcookie("serverId", $_GET["serverId"], time() + 43200 /* 12時間 */);
}
if (!isset($_GET["code"])) {
    echo <<<PHP_EOL
<meta http-equiv="refresh" content="0;URL=https://discord.com/oauth2/authorize?client_id=973860607969337344&response_type=code&redirect_uri=https%3A%2F%2Fvc-ymgs.f5.si&scope=identify">
</head>
<body style="background: none">
<p style="font-family: sans-serif">Redirect to <a href="https://discord.com/oauth2/authorize?client_id=973860607969337344&response_type=code&redirect_uri=https%3A%2F%2Fvc-ymgs.f5.si&scope=identify">https://discord.com/oauth2/authorize?client_id=973860607969337344&response_type=code&redirect_uri=https%3A%2F%2Fvc-ymgs.f5.si&scope=identify</a></p>
</body>
PHP_EOL;
} else {
    echo <<<PHP_EOL
</head>
<body>
<script src="lib/simplepeer.min.js"></script>
<script src="lib/model/UserSetting.js"></script>
<script src="lib/model/Member.js"></script>
<script src="lib/model/SoundEffects.js"></script>
<script src="lib/main.js"></script>
<div class="backgroundDiv">
    <img src="resource/background.png" id="background" alt="紫色の幾何学模様の背景画像">
</div>
<header class="header">
    <p id="logo">YMGS Sync Communicator</p>
    <div id="headerUserIconWrapper">
        <img src="resource/unknown_user.png" alt="ユーザーのDiscordアイコン" id="headerUserIcon">
    </div>
</header>
<div id="contentWrapper">
    <div id="controlButtonWrapper" class="standardContent">
        <div class="controlButton" id="muteButton">
            <img src="resource/mike_mute.png" alt="押すとミュートが解除されるマイクのボタン" id="muteButtonImg">
        </div>
        <div class="controlButton" id="speakerMuteButton">
            <img src="resource/speaker_unmute.png" alt="押すとスピーカーがミュートされるボタン" id="speakerMuteButtonImg">
        </div>
        <div class="controlButton" id="serverMuteStatus">
            <img src="resource/server_unmute.png" alt="サーバーミュートされていないことを示すアイコン" id="serverMuteStatusImg">
        </div>
        <div class="controlButton" id="minecraftJoinStatus">
            <img src="resource/minecraft_unjoin.png" alt="マインクラフトサーバーに参加していることを示すアイコン" id="minecraftJoinStatusImg">
        </div>
    </div>
    <div id="memberList" class="standardContent">
    </div>
    <div id="log" class="standardContent">
    </div>
</div>
<section id="userInfoModal" class="modal">
    <div class="modalBackground" id="userInfoModalBackground"></div>
    <div class="modalWrapper">
        <div class="modalContents">
            <div id="modalUserIconWrapper">
                <img src="resource/unknown_user.png" alt="ユーザーのDiscordアイコン" id="modalUserIcon">
            </div>
            <p id="modalUserInformation">Discord未連携</p>
        </div>
        <div id="userInfoModalCloseButton" class="modalCloseButton">×</div>
    </div>
</section>
<section id="connectionConfirmModal" class="modal">
    <div class="modalBackground" id="connectionConfirmModalBackground"></div>
    <div class="modalWrapper">
        <div class="modalContents">
            <p id="connectionConfirmText">接続の用意ができましたら下のボタンを押してください</p>
            <button id="connectionConfirmButton">接続</button>
        </div>
    </div>
</section>
<div id="audioBox">
</div>
</body>
PHP_EOL;

}
?>

</html>