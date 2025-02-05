
let userSetting;

let members = {};
let me;
let webSocket;
let webSocketEnabled = false;
let isOp = false;
/** @type {MediaStream|false} */
let stream = null;
let connectionFailedCount = 0;
let audioContext = null;
let errorOccurred = false;
let messagePostable = true;
let messagePostCount = 0;

let myAnalyzerNode = null;
let myAnalyzedFrequencies = null;
let mySpeakingFlag = false;
let virtualVolumeRange = null;

/** @type {TextReading[]} */
let textReadingQueue = [];

let getMikeStreamPromise;
let connectionConfirmButtonClickedPromise;

function adjustBackground() {
    let background = document.getElementById("background");
    let logo = document.getElementById("logo");
    if (window.innerWidth / window.innerHeight > 1280 / 720) { /* 横長 */
        background.classList.add("backgroundAdjustToWidth");
        background.classList.remove("backgroundAdjustToHeight");
        background.style.left = (0).toString();
        logo.classList.remove("hide");
    } else { /* 縦長 */
        background.classList.add("backgroundAdjustToHeight");
        background.classList.remove("backgroundAdjustToWidth");
        background.style.left = (-((background.width - window.innerWidth) /2)).toString() + "px";
        logo.classList.add("hide");
    }
}

/**
 * @param {HTMLInputElement} element
 * @param {string} color
 */
function adjustmentMemberVolumeSliderBackGround(element, color) {
    const volumePercentage = element.value / element.max * 100;
    element.style.background = "linear-gradient(to right, " + color + " " + volumePercentage + "%, rgba(255, 255, 255, 0) " + volumePercentage + "%)"
}

function systemLog(message) {
    addLogMessage("systemLog", message);
    console.log(message);
}

function noticeLog(message) {
    addLogMessage("noticeLog", message);
}

function remoteLog(message) {
    addLogMessage("remoteLog", message);
}

function transferLog(message) {
    addLogMessage("transferLog", message);
}

function errorLog(message) {
    addLogMessage("errorLog", message);
    for (/** @type {Member} */ let member of Object.values(members)) {
        member.disconnect();
    }
    errorOccurred = true;
    webSocket?.close();
}

function removeMikeAudio() {
    for (let member of Object.values(members)) {
        member.removeMike();
    }
    stream = false;
}

function addMikeAudio() {
    for (let member of Object.values(members)) {
        member.removeMike();
    }
    navigator.mediaDevices.getUserMedia({
        video: false,
        audio: true
    }).then(media => {
        stream = media;
        for (/** @type {Member} */let member of Object.values(members)) {
            member.addMike();
        }
    }).catch((e) => {
        console.log(e);
        userSetting.setMute(true);
    });
}

function addLogMessage(logTypeClass, message) {
    const messageDiv = document.createElement("div");
    messageDiv.classList.add("messageDiv");
    const PElement = document.createElement("p");
    PElement.classList.add(logTypeClass);
    /* Do NOT modify the variable name to innerHTML. Any malicious third party can add messages. */
    PElement.textContent = message;
    messageDiv.appendChild(PElement);
    const logDiv = document.getElementById("log");
    const scrolled = logDiv.clientHeight + logDiv.scrollTop + 1 >= logDiv.scrollHeight;
    logDiv.appendChild(messageDiv);
    if (scrolled) {
        logDiv.scrollBy(0, PElement.scrollHeight);
    }
    setTimeout(() => PElement.style.transform = "translateY(0)", 10);
}

function establishWebSocketConnection() {
    if (errorOccurred) {
        systemLog("接続はキャンセルされました")
        return;
    }
    const serverId = (new URL(window.location.href)).searchParams.get("serverId") ?? getCookie("serverId") ?? "1";
    try {
        webSocket = new WebSocket("wss://vc-ymgs.f5.si:" + (parseInt(serverId) + 8290).toString());
    } catch (exception) {
        systemLog("リレーサーバーに接続できませんでした")
        systemLog("5秒後に再接続を試みます")
        setTimeout(() => {
            systemLog("リレーサーバーに再接続中です...")
            establishWebSocketConnection();
        }, 5000);
    }
    webSocket.onopen = event => {
        systemLog("リレーサーバーと接続しました");
        connectionFailedCount = 0;
        const params = (new URL(window.location.href)).searchParams;
        if (!params.has("code")) {
            errorLog("Discord認証フォームにリダイレクトされていません (エラーコード:303)");
            return;
        }
        webSocket.send(JSON.stringify({"type":"auth", "code":params.get("code")}));
        webSocketEnabled = true;
        setInterval(() => {
            if (errorOccurred) {
                return;
            }
            webSocket.send("{\"type\":\"ping\"}");
        }, 1500);
        setInterval(() => {
            messagePostCount = 0;
        }, 3000);
    }
    webSocket.onclose = event => {
        for (/** @type {Member} */ let member of Object.values(members)) {
            member.disconnect();
        }
        if (errorOccurred) {
            return;
        }
        systemLog("リレーサーバーとの接続に失敗しました");
        if (connectionFailedCount++ === 5) {
            noticeLog("インターネット接続を確認いただき、問題がない場合はよもぎサーバー運営にこの問題を報告してください。serverIdを指定している場合は、idの打ち間違いにも注意してください");
            errorLog("リレーサーバーとの接続に繰り返し失敗しました");
        }
        systemLog("5秒後に再接続を試みます")
        setTimeout(() => {
            systemLog("リレーサーバーに再接続中です...");
            establishWebSocketConnection();
        }, 5000);
    }
    webSocket.onmessage = event => {
        /** @type {type: string} */
        let data;
        try {
            data = JSON.parse(event.data);
        } catch (exception) {
            errorLog("サーバーから受け取ったデータが欠損しています (jsonのパースに失敗) (エラーコード:401)");
            return;
        }
        console.log("Websocket -> " + event.data);
        if (!"type" in data) {
            errorLog("サーバーから受け取ったデータが欠損しています (未定義のtypeプロパティ) (エラーコード:402)");
            return;
        }
        switch (data["type"]) {
            case "show_user_info":
                systemLog("discordとの連携に成功しました");
                document.getElementById("headerUserIcon").src = document.getElementById("modalUserIcon").src = data["avatar_url"];
                document.getElementById("modalUserInformation").innerText = "Discord / Minecraft と連携中！\nDiscord: " + data["discord_name"] + ", Minecraft: " + data["gamer_tag"];
                isOp = data["op"];
                me = new Member(data["gamer_tag"], true);
                me.addElements();
                Promise.allSettled([getMikeStreamPromise, connectionConfirmButtonClickedPromise]).then(() => {
                    addAnalyzerToMyStream();
                    webSocket.send(JSON.stringify({"type": "join_request"}));
                });
                break;
            case "show_discord_info":
                systemLog("discordとの連携に成功しました");
                document.getElementById("headerUserIcon").src = document.getElementById("modalUserIcon").src = data["avatar_url"];
                document.getElementById("modalUserInformation").innerText = "よもぎサーバーのDiscord内でDiscordアカウントとMinecraftアカウントを連携してください！\nDiscord: " + data["discord_name"] + ", Minecraft: unknown";
                break;
            case "member_list":
                for (/** @type {Member} */ let member of Object.values(members)) {
                    member.disconnect();
                }
                if (Object.keys(data["list"]).length === 0) {
                    noticeLog("ここにはまだ誰もいないようです");
                    break;
                }
                for (/** @type {string} */ let name of data["list"]) {
                    members[name] = new Member(name, false);
                    members[name].addElements();
                    members[name].sendOffer();
                }
                break;
            case "error":
                errorLog(data["message"]);
                break;
            case "renew_code":
                noticeLog("URL内のcodeの値が無効ですので、再度の取得をお願いします");
                window.location.href = "https://discord.com/oauth2/authorize?client_id=973860607969337344&response_type=code&redirect_uri=https%3A%2F%2Fvc-ymgs.f5.si&scope=identify";
                break;
            case "vc_offer": {
                let name = data["from"];
                if (name in members) {
                    return;
                }
                members[name] = new Member(name, false);
                members[name].addElements();
                members[name].acceptOffer(data["data"]);
                break;
            }
            case "vc_confirm": {
                let name = data["from"];
                if (!(name in members)) {
                    systemLog(name + "からの不正な要求が拒否されました");
                    return;
                }
                members[name].acceptAnswer(data["data"]);
                break;
            }
            case "change_sound":
                for (let name in members) {
                    if (!(name in data["sound"])) {
                        members[name].setDistanceVolume(0);
                        members[name].setSoundShouldBeSent(false);
                    } else {
                        members[name].setDistanceVolume(data["sound"][name]["volume"]);
                        members[name].setPan(data["sound"][name]["pan"]);
                        members[name].setSoundShouldBeSent(data["send"].includes(name));
                    }
                    members[name].resetGainNode();
                    members[name].resetPannerNode();
                }
                break;
            case "disconnect":
                systemLog(data["user"] + "との接続を中止します");
                members[data["user"]]?.disconnect();
                break;
            case "property":
                switch (data["key"]) {
                    case "join_minecraft":
                        userSetting.setMinecraftJoinStatus(data["value"]);
                        break;
                    case "server_mute":
                        userSetting.setServerMuteStatus(data["value"]);
                        break;
                }
                break;
            case "kick":
                errorLog("管理者に退出させられました (エラーコード:202)");
                break;
            case "server_mute": {
                let name = data["name"];
                if (!(name in members)) {
                    if (name !== me.name) {
                        return;
                    }
                    noticeLog(data["value"] ? "サーバー管理者にミュートされました" : "サーバーミュートは解除されました");
                    userSetting.setServerMuteStatus(data["value"]);
                    return;
                }
                members[name].setServerMute(data["value"]);
                break;
            }
            case "confirm_connection": {
                let myTurnFlag = false;
                for (let name of data["join"]) {
                    if (name === me.name) {
                        myTurnFlag = true;
                        continue;
                    }
                    if ((name in members) || myTurnFlag) {
                        continue;
                    }
                    systemLog(name + "との接続を復旧しています...");
                    members[name] = new Member(name, false);
                    members[name].addElements();
                    members[name].sendOffer();
                }
                break;
            }
            case "remote_sound": {
                if (audioContext === null) {
                    break;
                }
                if ("content" in data) {
                    remoteLog(data["content"]);
                }
                let oscillator = audioContext.createOscillator();
                oscillator.type = "sine";
                const gainNode = audioContext.createGain();
                gainNode.gain.value = 0.3;
                oscillator.frequency.setValueAtTime(1244, audioContext.currentTime);
                oscillator.connect(gainNode).connect(audioContext.destination);
                oscillator.start();
                setTimeout(() => {
                    (new Promise(async () => {
                        const audioBufferSourceNode = audioContext.createBufferSource();
                        audioBufferSourceNode.buffer = await audioContext.decodeAudioData(await (await fetch("data:audio/mp3;base64," + data["base64"])).arrayBuffer());
                        const gainNode = audioContext.createGain();
                        gainNode.gain.value = 0.3;
                        audioBufferSourceNode.onended = () => {
                            setTimeout(() => {
                                let e2Oscillator = audioContext.createOscillator();
                                e2Oscillator.type = "sine";
                                const gainNode = audioContext.createGain();
                                gainNode.gain.value = 0.3;
                                e2Oscillator.frequency.setValueAtTime(1244, audioContext.currentTime);
                                e2Oscillator.connect(gainNode).connect(audioContext.destination);
                                e2Oscillator.start();
                                setTimeout(() => e2Oscillator?.stop(), 400);
                            }, 200);
                        };
                        audioBufferSourceNode.connect(gainNode).connect(audioContext.destination);
                        audioBufferSourceNode.start();
                    })).then(oscillator?.stop());
                }, 100);
                break;
            }
            case "chat":
                addLogMessage(
                    "stdLog",
                    "<" + (data["platform"] === "web" ? "" : data["platform"] + ":") + data["user_name"] + "> " + data["context"]
                );
                break;
            case "chat_failed":
                noticeLog(data["reason"]);
                messagePostError();
                break;
            case "chat_succeeded": {
                messagePostable = true;
                /** @type HTMLInputElement */
                const chatInput = document.getElementById("chatInput");
                chatInput.value = "";
                recoverChatInput();
                break;
            }
            case "text_read": {
                let member = members[data["user_name"]] ?? null;
                if (member === null && me.name === data["user_name"]) {
                    member = me;
                }
                if (member === null) {
                    break;
                }
                addTextReadingQueue(new TextReading(member, data["mp3_base64"]));
                break;
            }
            case "transfer": {
                if (data["user_name"] !== me.name) {
                    transferLog(data["user_name"] + "の移動先サーバー番号: " + data["id"])
                    break;
                }
                setCookie("serverId", data["id"].toString())
                window.location.href = "https://discord.com/oauth2/authorize?client_id=973860607969337344&response_type=code&redirect_uri=https%3A%2F%2Fvc-ymgs.f5.si&scope=identify";
                break;
            }
        }
    }
}

window.addEventListener("load", () => {
    userSetting = UserSetting.loadFromStorage();
    let streamRefused;
    getMikeStreamPromise = new Promise(resolve => {
        navigator.mediaDevices.getUserMedia({
            video: false,
            audio: true
        }).then(media => {
            streamRefused = false;
            stream = media;
            userSetting.setMute(userSetting.isMute());
        }).catch(() => {
            streamRefused = true;
            userSetting.setMute(true);
        }).finally(() => {
            if (streamRefused) {
                stream = false;
            }
            resolve();
        });
    });
    adjustBackground();
    window.addEventListener("resize", event => {
        adjustBackground();
    })
    /* Mac OS doesn't recognize this event, but not affected... */
    window.addEventListener("visibilitychange", () => {
        if (document.visibilityState !== "hidden" || audioContext === null) {
            return;
        }
        audioContext.resume();
    });
    document.getElementById("headerUserIconWrapper").addEventListener("click", event => {
        const userInfoModalElement = document.getElementById("userInfoModal");
        userInfoModalElement.style.display = "block";
    })
    document.getElementById("userInfoModalCloseButton").addEventListener("click", event => {
        const userInfoModalElement = document.getElementById("userInfoModal");
        userInfoModalElement.style.display = "none";
    })
    document.getElementById("userInfoModalBackground").addEventListener("click", event => {
        const userInfoModalElement = document.getElementById("userInfoModal");
        userInfoModalElement.style.display = "none";
    })
    document.getElementById("modalUserLicenceButton").addEventListener("click", event => {
        const userInfoModalElement = document.getElementById("userInfoModal");
        userInfoModalElement.style.display = "none";
        const licenseModalElement = document.getElementById("licenseModal");
        licenseModalElement.style.display = "block";
    })
    document.getElementById("licenseModalBackground").addEventListener("click", event => {
        const licenseModalElement = document.getElementById("licenseModal");
        licenseModalElement.style.display = "none";
    })
    document.getElementById("licenseModalCloseButton").addEventListener("click", event => {
        const licenseModalElement = document.getElementById("licenseModal");
        licenseModalElement.style.display = "none";
    })
    window.addEventListener("keydown", event => {
        if (event.key !== "Escape") {
            return;
        }
        const licenseModalElement = document.getElementById("licenseModal");
        licenseModalElement.style.display = "none";
        const userInfoModalElement = document.getElementById("userInfoModal");
        userInfoModalElement.style.display = "none";
    })
    connectionConfirmButtonClickedPromise = new Promise(resolve => {
        document.getElementById("connectionConfirmButton").addEventListener("click", async event => {
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            audioContext = new AudioContext();
            new SoundEffects();
            const connectionConfirmModal = document.getElementById("connectionConfirmModal");
            connectionConfirmModal.style.display = "none";
            if (/iPhone|iPad|iPod/.test(navigator.userAgent) && stream === false) {
                errorLog("iPhoneやiPadなどの端末では、通話に参加する際にマイクの使用を許可する必要があります。セルフミュートは、クライアントサイドで正常に機能します (エラーコード:304)")
            }
            resolve();
        })
    });
    document.getElementById("muteButton").addEventListener("click",  () => {
        SoundEffects.getInstance().play("button");
        userSetting.setMute(!userSetting.isMute());
    });
    document.getElementById("speakerMuteButton").addEventListener("click",  () => {
        SoundEffects.getInstance().play("button");
        userSetting.setDeaf(!userSetting.isDeaf());
    });
    const chatInputElement = document.getElementById("chatInput");
    chatInputElement.addEventListener("keydown", event => {
        if (event.key !== "Enter") {
            return;
        }
        postInputMessage();
    });
    chatInputElement.addEventListener("beforeinput", event => {
        if (!messagePostable) {
            event.preventDefault();
            return;
        }
        chatInputElement.style.color = "rgba(255, 255, 255, 0.69)";
    });
    document.getElementById("chatSubmit").addEventListener("click", () => {
        postInputMessage();
    });
    establishWebSocketConnection();
});

function addAnalyzerToMyStream() {
    if (stream === null) {
        console.error("function:addAnalyzerToMyStream() must be called after stream is created");
        return;
    }
    if (stream === false) {
        return;
    }
    const streamMediaSource = audioContext.createMediaStreamSource(stream);
    const destination = audioContext.createMediaStreamDestination();
    myAnalyzerNode = audioContext.createAnalyser();
    myAnalyzedFrequencies = new Uint8Array(myAnalyzerNode.frequencyBinCount);
    streamMediaSource.connect(myAnalyzerNode).connect(destination);
    setInterval(() => {
        if (UserSetting.getInstance().isMute()) {
            return;
        }
        myAnalyzerNode.getByteFrequencyData(myAnalyzedFrequencies);
        let volume = myAnalyzedFrequencies.reduce((accumulator, current) => accumulator + current) / myAnalyzerNode.frequencyBinCount;
        if (volume > 7) {
            if (!mySpeakingFlag) {
                virtualVolumeRange.style.background = "rgba(0, 255, 157, 0.32)";
            }
            mySpeakingFlag = true;
        } else {
            if (mySpeakingFlag) {
                virtualVolumeRange.style.background = "rgba(88, 88, 88, 0.46)";
            }
            mySpeakingFlag = false;
        }
    }, 100);
}

function postInputMessage() {
    if (!messagePostable) {
        return;
    }
    /** @type HTMLInputElement */
    const inputElement = document.getElementById("chatInput");
    const context = inputElement.value
    if (context === "") {
        return;
    }
    if (!webSocketEnabled) {
        noticeLog("メッセージを接続確立前に送信することはできません");
        messagePostError();
        return;
    }
    inputElement.style.color = "rgba(255,255,255,0.33)";
    inputElement.disabled = true;
    if (++messagePostCount >= 4) {
        messagePostable = false;
        noticeLog("チャットの送信間隔が短すぎます");
        setTimeout(() => messagePostError(), 10);
        return;
    }
    postMessage(context);
    messagePostable = false;
}

function messagePostError() {
    const inputElement = document.getElementById("chatInput");
    inputElement.classList.add("shiver");
    inputElement.style.color = "rgba(255, 132, 132, 0.69)"
    recoverChatInput();
    messagePostable = true;
    setTimeout(() => {
        inputElement.classList.remove("shiver");
    }, 300)
}

function recoverChatInput() {
    const inputElement = document.getElementById("chatInput");
    inputElement.disabled = false;
    inputElement.focus();
}

/**
 * @param {string} context
 * @return {boolean}
 */
function postMessage(context) {
    if (!webSocketEnabled || !messagePostable) {
        return false;
    }
    webSocket.send(JSON.stringify({"type":"chat", "context":context}))
    return true;
}

/**
 * @param {TextReading} textReading
 */
function addTextReadingQueue(textReading) {
    textReadingQueue.push(textReading);
    if (textReadingQueue.length !== 1) {
        return;
    }
    textReading.play();
}

function playNextTextReading() {
    textReadingQueue.pop();
    if (textReadingQueue.length === 0) {
        return;
    }
    textReadingQueue[0].play();
}

/**
 * @param {string} name
 * @return {string|null}
 */
function getCookie(name) {
    return document.cookie.split("; ").find(each => each.startsWith(name + "="))?.split("=")[1];
}

/**
 * @param {string} key
 * @param {string} value
 * @param {number} expireTimeSecond
 */
function setCookie(key, value, expireTimeSecond = 43200) {
    document.cookie = key + "=" + value + "; max-age=" + expireTimeSecond;
}