class UserSetting {
    /** @type {boolean} */
    mute;
    /** @type {boolean} */
    deaf;
    /** @type {{}} */
    volume;
    /** @type {UserSetting|null} */
    static instance = null;

    /**
     * @param {boolean} mute
     * @param {boolean} deaf
     * @param {{}} volume
     */
    constructor(mute = false, deaf = false, volume = {}) {
        this.mute = mute;
        this.deaf = deaf;
        this.volume = volume;
        UserSetting.instance = this;
    }

    /** @return {boolean} */
    isMute() {
        return this.mute;
    }

    /** @return {boolean} */
    isDeaf() {
        return this.deaf;
    }

    /**
     * @param {string} playerName
     * @return {float|number}
     */
    getVolume(playerName) {
        return this.volume[playerName] ?? 1;
    }

    /**
     * @param {boolean} mute
     * @return {UserSetting}
     */
    setMute(mute) {
        if (stream !== null && stream !== false) {
            for (let track of stream.getTracks()) {
                track.enabled = !mute;
            }
        } else if (!mute) {
            noticeLog("マイクが許可されていないため、ミュートを解除できません");
            return this;
        }
        this.mute = mute;
        document.getElementById("muteButton").style.backgroundColor = mute ? "#c4c4c4ff" : "#c2a5e2";
        document.getElementById("muteButtonImg").src = mute ? "resource/mike_mute.png" : "resource/mike_unmute.png";
        me?.setMikeMuteDisplay(mute);
        for (let member of Object.values(members)){
            member.sendMySetting();
        }
        return this;
    }

    /**
     * @param {boolean} deaf
     * @return {UserSetting}
     */
    setDeaf(deaf) {
        this.deaf = deaf;
        document.getElementById("speakerMuteButton").style.backgroundColor = deaf ? "#c4c4c4ff" : "#c2a5e2";
        document.getElementById("speakerMuteButtonImg").src = deaf ? "resource/speaker_mute.png" : "resource/speaker_unmute.png";
        me?.setSpeakerMuteDisplay(deaf);
        for (let member of Object.values(members)){
            member.sendMySetting();
        }
        return this;
    }

    /**
     * @param {boolean} muted
     * @return {UserSetting}
     */
    setServerMuteStatus(muted) {
        document.getElementById("serverMuteStatus").style.backgroundColor = muted ? "#e0acc0" : "#acb4e0";
        document.getElementById("serverMuteStatusImg").src = muted ? "resource/server_mute.png" : "resource/server_unmute.png";
        me?.setServerMute(muted);
    }

    /**
     * @param {boolean} join
     * @return {UserSetting}
     */
    setMinecraftJoinStatus(join) {
        document.getElementById("minecraftJoinStatus").style.backgroundColor = join ? "#e0b8ac" : "#c4c4c4ff";
        document.getElementById("minecraftJoinStatusImg").src = join ? "resource/minecraft_join.png" : "resource/minecraft_unjoin.png";
    }

    /**
     * @param {string} player
     * @param {float|int} volume
     * @return {UserSetting}
     */
    setVolume(player, volume) {
        this.volume[player] = volume;
        return this;
    }

    /** @return {{volume: {}, deaf: boolean, mute: boolean}} */
    serialize() {
        return {"mute": this.mute, "deaf": this.deaf, "volume": this.volume};
    }

    /** @return {{deaf: boolean, mute: boolean}} */
    pack() {
        return {"mute": this.mute, "deaf": this.deaf};
    }

    /**
     * @param {{volume: {}, deaf: boolean, mute: boolean}} data
     * @return {UserSetting}
     */
    static deserialize(data) {
        let instance =  new UserSetting(data.mute, data.deaf, data.volume);
        instance.setMute(data.mute);
        instance.setDeaf(data.deaf);
        instance.setServerMuteStatus(false);
        instance.setMinecraftJoinStatus(false);
        return instance;
    }

    save() {
        localStorage.setItem("user_setting", JSON.stringify(this.serialize()));
    }

    /** @return {UserSetting} */
    static loadFromStorage() {
        let data = localStorage.getItem("user_setting");
        if (data === null) {
            data = {"mute": true, "deaf": false, "volume": {}}
        } else {
            data = JSON.parse(data);
        }
        return UserSetting.deserialize(data);
    }

    /** @return {UserSetting|null} */
    static getInstance() {
        return UserSetting.instance;
    }

}