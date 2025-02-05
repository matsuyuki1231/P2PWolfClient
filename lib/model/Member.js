class Member {
    /** @type {SimplePeer} */
    peer;
    /** @type {string} */
    name;
    /** @type {boolean} */
    isSelf;
    /** @type {boolean} */
    initiator;
    /** @type {boolean} */
    connectionEstablished;
    /** @type {{server_mute: HTMLImageElement, mike_mute: HTMLImageElement, kick: HTMLImageElement, speaker_mute: HTMLImageElement}} */
    statusElements;
    /** @type {HTMLParagraphElement} */
    nameElement;
    /** @type {HTMLDivElement} */
    memberWrapperElement;
    /** @type {HTMLInputElement} */
    volumeRangeElement;
    /**
     * @type {HTMLAudioElement}
     * @deprecated audioElementのsrcObjectに代入されたstreamは再生されません https://stackoverflow.com/questions/63296568/webaudio-connecting-stream-to-destination-doesnt-work
     * @see audio
     */
    audioElement = null;
    audio = null;
    /** @type {boolean} */
    isMute;
    /** @type {boolean} */
    isDeaf;
    /** @type {boolean} */
    isServerMuted;
    /** @type {boolean} */
    soundShouldBeSent;
    /** @type {float|int} */
    distanceVolume;
    /** @type {float|int} */
    pan;
    /** @type {int|null} */
    analyzeIntervalID = null;
    /** @type {boolean} */
    sendKickDataFlag = false;
    /** @type {boolean} */
    speakingFlag = false;
    gainNode = null;
    stereoPannerNode = null;
    analyzerNode = null;
    analyzedFrequencies = null;


     /**
     * @param {string} name
     * @param {boolean} isSelf
     */
    constructor(name, isSelf) {
        this.name = name;
        this.isSelf = isSelf;
        this.connectionEstablished = false;
        this.isMute = this.isDeaf = this.isServerMuted = false;
        this.soundShouldBeSent = false;
        this.distanceVolume = 0;
        this.pan = 0;
    }

    resetGainNode() {
        if (this.gainNode === null) {
            return;
        }
        this.gainNode.gain.value = this.getDistanceVolume() * this.speakingFlag * (!UserSetting.getInstance().isDeaf()) * (!this.isServerMuted) * (!this.isMute)  * (this.getVolume() / 100);
    }

    resetPannerNode() {
        if (this.stereoPannerNode === null) {
            return;
        }
        this.stereoPannerNode.pan.value = this.getPan();
    }

    /** @return {int} */
    getVolume() {
        return UserSetting.getInstance()?.getVolume(this.name) ?? 70;
    }

    /** @param {int} volume */
    setVolume(volume) {
        UserSetting.getInstance()?.setVolume(this.name, volume).save();
        this.resetGainNode();
    }

    /** @return {string} */
    getName() {
        return this.name;
    }

    /** @return {boolean} */
    isInitiator() {
        return this.initiator;
    }

    getSoundShouldBeSent() {
        return this.soundShouldBeSent;
    }

    /** @param {boolean} value */
    setSoundShouldBeSent(value) {
        this.soundShouldBeSent = value;
    }

    getDistanceVolume() {
        return this.distanceVolume;
    }

    /** @param {float|int} value */
    setDistanceVolume(value) {
        this.distanceVolume = value;
    }

    getPan() {
        return this.pan;
    }

    /** @param {float|int} value */
    setPan(value) {
        this.pan = value;
    }

    /** @param {boolean} value */
    setServerMute(value) {
        this.setServerMuteDisplay(value);
        this.isServerMuted = value;
        this.resetGainNode();
    }

    /** @param {boolean} value */
    setMikeMuteDisplay(value) {
        this.isMute = value;
        this.resetGainNode();
        this.statusElements.mike_mute.src = value ? "./resource/stat_mike_mute.png" : "./resource/stat_none.png";
    }

    /** @param {boolean} value */
    setSpeakerMuteDisplay(value) {
        this.isDeaf = value;
        this.resetGainNode();
        this.statusElements.speaker_mute.src = value ? "./resource/stat_speaker_mute.png" : "./resource/stat_none.png";
    }

    /** @param {boolean} value */
    setServerMuteDisplay(value) {
        this.statusElements.server_mute.src = value ? "./resource/stat_server_mute.png" : "./resource/stat_none.png";
    }

    kick() {
        webSocket.send(JSON.stringify({"type": "kick", "name": this.name}));
    }

    /** @param {boolean} value */
    serverMute(value) {
        webSocket.send(JSON.stringify({"type": "server_mute", "name": this.name, "value": value}));
    }

    addElements() {
        this.memberWrapperElement = document.createElement("div");
        this.memberWrapperElement.classList.add("memberWrapper");
        const memberStatusWrapper = document.createElement("div");
        memberStatusWrapper.classList.add("memberStatusWrapper")
        this.memberWrapperElement.appendChild(memberStatusWrapper);
        this.statusElements = {
            "mike_mute": document.createElement("img"),
            "speaker_mute": document.createElement("img"),
            "server_mute": document.createElement("img"),
            "kick": document.createElement("img"),
        }
        this.statusElements.mike_mute.alt = "メンバーがマイクをミュートしているかを示すアイコン";
        this.statusElements.speaker_mute.alt = "メンバーがスピーカーをミュートしているかを示すアイコン";
        this.statusElements.server_mute.alt = "メンバーがサーバーミュートされているかを示すアイコン";
        this.statusElements.kick.alt = "メンバーをキックするボタン";
        this.statusElements.kick.src = "resource/kick.png";
        if (this.isSelf) {
            this.setMikeMuteDisplay(UserSetting.getInstance().isMute());
            this.setSpeakerMuteDisplay(UserSetting.getInstance().isDeaf());
            this.setServerMuteDisplay(false);
        } else {
            this.setMikeMuteDisplay(false);
            this.setSpeakerMuteDisplay(false);
            this.setServerMuteDisplay(false);
        }
        if (isOp) {
            this.statusElements.kick.addEventListener("click", () => {
                if (!this.sendKickDataFlag) {
                    this.sendKickDataFlag = true;
                    noticeLog("3秒以内にもう一度ボタンを押して" + this.name + "をkickします");
                    setTimeout(() => {
                        if (!(this.name in members)) {
                            return;
                        }
                        members[this.name].sendKickDataFlag = false;
                    }, 3000);
                    return;
                }
                noticeLog(this.name + "をkickしました");
                this.kick();
                this.sendKickDataFlag = false;
            });
            this.statusElements.server_mute.addEventListener("click", () => {
                noticeLog(!this.isServerMuted ? this.name + "をサーバーミュートしました" : this.name + "のサーバーミュートを解除しました");
                this.serverMute(!this.isServerMuted);
            })
        } else {
            this.statusElements.kick.style.display = "none";
        }
        memberStatusWrapper.append(...Object.values(this.statusElements));
        const volumeAdjustableBox = document.createElement("div");
        volumeAdjustableBox.classList.add("volumeAdjustableBox");
        this.memberWrapperElement.appendChild(volumeAdjustableBox);
        this.nameElement = document.createElement("p");
        this.nameElement.textContent = this.name;
        if (!this.isSelf) {
            this.nameElement.classList.add("nonConnection");
        }
        volumeAdjustableBox.appendChild(this.nameElement);
        if (this.isSelf) {
            virtualVolumeRange = document.createElement("div");
            virtualVolumeRange.classList.add("virtualVolumeSlider");
            volumeAdjustableBox.appendChild(virtualVolumeRange);
        } else {
            this.volumeRangeElement = document.createElement("input");
            this.volumeRangeElement.type = "range";
            this.volumeRangeElement.min = "0";
            this.volumeRangeElement.max = "100";
            this.volumeRangeElement.value = this.getVolume().toString();
            adjustmentMemberVolumeSliderBackGround(this.volumeRangeElement, "rgba(94, 0, 255, 0.32)");
            this.volumeRangeElement.addEventListener("input", event => {
                adjustmentMemberVolumeSliderBackGround(event.target, this.speakingFlag ? "rgba(0, 255, 157, 0.32)" : "rgba(94, 0, 255, 0.32)");
                this.setVolume(event.target.value);
            })
            volumeAdjustableBox.appendChild(this.volumeRangeElement);
        }
        document.getElementById("memberList").appendChild(this.memberWrapperElement);
        this.audioElement = document.createElement("audio");
        document.getElementById("audioBox").append(this.audioElement);
    }

    disconnect() {
        this.peer.destroy();
    }

    deleteSelf() {
        if (this.analyzeIntervalID !== null) {
            clearInterval(this.analyzeIntervalID);
        }
        this.memberWrapperElement.remove();
        this.audioElement?.remove();
        if (members[this.name] === this) {
            delete members[this.name];
        }
        delete this;
    }

    /** @param {string} data JSONとしてserializeされた連想配列 */
    acceptOffer(data) {
        systemLog(this.name + "との接続を受理しています...");
        this.initiator = false;
        this.peer = new SimplePeer({stream: stream, trickle: false});
        this.setSignal();
        this.peer.signal(data);
    }

    /** @param {string} data JSONとしてserializeされた連想配列 */
    acceptAnswer(data) {
        if (this.peer === undefined) {
            return;
        }
        this.peer.signal(data);
    }

    sendOffer() {
        systemLog(this.name + "とのピアコネクションを確立しています...");
        this.initiator = true;
        this.peer = new SimplePeer({initiator: true, stream: stream, trickle: false});
        this.setSignal();
    }

    removeMike() {
        if (stream === false || stream === null) {
            return;
        }
        try {
            this.peer.removeStream(stream);
        } catch (e) {
            
        }
    }

    addMike() {
        if (stream === false || stream === null) {
            return;
        }
        this.peer.addStream(stream);
    }

    createAnalyzerTask() {
        this.analyzeIntervalID = setInterval(() => {
            this.analyzerNode.getByteFrequencyData(this.analyzedFrequencies);
            let volume = this.analyzedFrequencies.reduce((accumulator, current) => accumulator + current) / this.analyzerNode.frequencyBinCount;
            if (volume > 7) {
                if (!this.speakingFlag) {
                    adjustmentMemberVolumeSliderBackGround(this.volumeRangeElement, "rgba(0, 255, 157, 0.32)");
                }
                this.speakingFlag = true;
                this.resetGainNode();
            } else {
                if (this.speakingFlag) {
                    if ((textReadingQueue[0] ?? null)?.member === this) {
                        adjustmentMemberVolumeSliderBackGround(this.volumeRangeElement, "rgba(76,169,255,0.32)");
                    } else {
                        adjustmentMemberVolumeSliderBackGround(this.volumeRangeElement, "rgba(94, 0, 255, 0.32)");
                    }
                }
                this.speakingFlag = false;
                this.resetGainNode();
            }
        }, 100);
    }

    setSignal() {
        this.peer.on("signal", data => {
            switch (data.type) {
                case "offer":
                    webSocket.send(JSON.stringify({type: "vc_offer", send_to: this.name, data: data}));
                    console.log("Send -> " + JSON.stringify({type: "vc_offer", send_to: this.name, data: data}))
                    break;
                case "answer":
                    webSocket.send(JSON.stringify({type: "vc_offer_answer", send_to: this.name, data: data}));
                    console.log("Send -> " + JSON.stringify({type: "vc_offer_answer", send_to: this.name, data: data}))
                    break;
            }
        });
        this.peer.on("connect", () => {
            if (this.isInitiator()) {
                systemLog(this.name + "との接続が確立されました");
            } else {
                noticeLog(this.name + "が参加しました");
                SoundEffects.getInstance().play("join");
            }
            this.nameElement.classList.remove("nonConnection");
            this.connectionEstablished = true;
            this.sendMySetting();
        });
        this.peer.on("close", () => {
            noticeLog(this.name + "が退出しました");
            SoundEffects.getInstance().play("quit");
            this.deleteSelf();
        });
        this.peer.on("data", data => {
            data = JSON.parse(data);
            switch (data.type) {
                case "status_update":
                    this.setMikeMuteDisplay(data.data.mute);
                    this.setSpeakerMuteDisplay(data.data.deaf);
                break;
            }
        });
        this.peer.on("error", error => {
            this.disconnect();
        })
        this.peer.on("stream", receivedStream => {
            this.audioElement.srcObject = receivedStream;
            this.audioElement.muted = true;
            const streamMediaSource = audioContext.createMediaStreamSource(receivedStream);
            const destination = audioContext.createMediaStreamDestination();
            this.gainNode = audioContext.createGain();
            this.stereoPannerNode = audioContext.createStereoPanner();
            this.analyzerNode = audioContext.createAnalyser();
            this.analyzedFrequencies = new Uint8Array(this.analyzerNode.frequencyBinCount);
            this.gainNode.gain.value = this.getDistanceVolume() * this.speakingFlag * (!UserSetting.getInstance().isDeaf()) * (!this.isServerMuted) * (!this.isMute) * (this.getVolume() / 0.7);
            this.stereoPannerNode.pan.value = this.getPan();
            streamMediaSource.connect(this.analyzerNode).connect(this.gainNode).connect(this.stereoPannerNode).connect(destination);
            this.audio = new Audio();
            this.audio.srcObject = destination.stream;
            if (audioContext.state === "suspended") {
                audioContext.resume();
            }
            this.audioElement.play();
            this.audio.play();
            this.createAnalyzerTask();
        });
        setTimeout(() => {
            if (!this.connectionEstablished) {
                systemLog(this.name + "とのピアコネクション確立に失敗しました");
                if (members[this.name] !== this) {
                    delete this;
                }
                this.deleteSelf();
            }
        }, 13000);
    }

    sendMySetting() {
        this.peer.send(JSON.stringify({type: "status_update", data: UserSetting.getInstance().pack()}));
    }

}