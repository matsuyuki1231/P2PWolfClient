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
<script src="lib/model/TextReading.js"></script>
<script src="lib/main.js"></script>
<div class="backgroundDiv">
    <img src="resource/background.png" id="background" alt="紫色の幾何学模様の背景画像">
</div>
<header class="header">
    <p id="logo">YMGS Sync Communicator</p>
    <button id="headerUserIconWrapper">
        <img src="resource/unknown_user.png" alt="ユーザーのDiscordアイコン" id="headerUserIcon">
    </button>
</header>
<div id="contentWrapper">
    <div id="controlButtonWrapper" class="standardContent">
        <button class="controlButton" id="muteButton">
            <img src="resource/mike_mute.png" alt="押すとミュートが解除されるマイクのボタン" id="muteButtonImg">
        </button>
        <button class="controlButton" id="speakerMuteButton">
            <img src="resource/speaker_unmute.png" alt="押すとスピーカーがミュートされるボタン" id="speakerMuteButtonImg">
        </button>
        <div class="controlButton" id="serverMuteStatus">
            <img src="resource/server_unmute.png" alt="サーバーミュートされていないことを示すアイコン" id="serverMuteStatusImg">
        </div>
        <div class="controlButton" id="minecraftJoinStatus">
            <img src="resource/minecraft_unjoin.png" alt="マインクラフトサーバーに参加していることを示すアイコン" id="minecraftJoinStatusImg">
        </div>
    </div>
    <div id="memberList" class="standardContent">
    </div>
    <div id="logWrapper" class="standardContent">
        <div id="log">
        </div>
        <div id="chatWrapper">
            <input type="text" id="chatInput">
            <img src="resource/chat_submit.png" alt="チャットの送信ボタン" id="chatSubmit">
        </div>
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
            <button id="modalUserLicenceButton" tabindex="1"><p class="modalBold">ライセンスを表示</p></button>
        </div>
        <button id="userInfoModalCloseButton" class="modalCloseButton" tabindex="2">×</button>
    </div>
</section>
<section id="licenseModal" class="modal">
    <div class="modalBackground" id="licenseModalBackground"></div>
    <div class="modalWrapper">
        <div class="modalContents" id="licenseModalContents">
            <p id="modalLicenseInformation">
                <span class="modalBold">当サイト内で使用しているコンテンツのうちライセンスの表記が必要なものについて、以下の通り記します。
                <br>なお、状況により使用しない場合もあります。</span class="modalBold">
                <br>VOICEVOX:四国めたん
                <br>VOICEVOX:ずんだもん
                <br>VOICEVOX:春日部つむぎ
                <br>VOICEVOX:雨晴はう
                <br>VOICEVOX:波音リツ
                <br>VOICEVOX:玄野武宏
                <br>VOICEVOX:白上虎太郎
                <br>VOICEVOX:青山龍星
                <br>VOICEVOX:冥鳴ひまり
                <br>VOICEVOX:九州そら
                <br>VOICEVOX:もち子さん (cv 明日葉よもぎ)
                <br>VOICEVOX:剣崎雌雄
                <br>VOICEVOX:WhiteCUL
                <br>VOICEVOX:後鬼
                <br>VOICEVOX:No.7
                <br>VOICEVOX:櫻歌ミコ
                <br>VOICEVOX:小夜/SAYO
                <br>VOICEVOX:ナースロボ＿タイプＴ
                <br>VOICEVOX:猫使アル
                <br>VOICEVOX:猫使ビィ
                <br>VOICEVOX:あいえるたん
                <br>VOICEVOX:琴詠ニア
                <br>Voice By ondoku3.com
            </p>
        </div>
        <button id="licenseModalCloseButton" class="modalCloseButton">×</button>
    </div>
</section>
<section id="connectionConfirmModal" class="modal">
    <div class="modalBackground" id="connectionConfirmModalBackground"></div>
    <div class="modalWrapper">
        <div class="modalContents">
            <p id="connectionConfirmText">接続の用意ができましたら下のボタンを押してください</p>
            <button id="connectionConfirmButton" tabindex="2">接続</button>
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