class TextReading {
    /** @type Member */
    member;
    /** @type string */
    audioMp3Base64;

    /**
     * @param {Member} member
     * @param {string} audioMp3Base64
     */
    constructor(member, audioMp3Base64) {
        this.member = member;
        this.audioMp3Base64 = audioMp3Base64;
    }

    async play() {
        if (!this.member.speakingFlag && !this.member.isSelf) {
            adjustmentMemberVolumeSliderBackGround(this.member.volumeRangeElement, "rgba(76,169,255,0.32)");
        }
        console.log(this.audioMp3Base64);
        const audioBufferSourceNode = audioContext.createBufferSource();
        audioBufferSourceNode.buffer = await audioContext.decodeAudioData(await (await fetch("data:audio/mp3;base64," + this.audioMp3Base64)).arrayBuffer());
        const gainNode = audioContext.createGain();
        gainNode.gain.value = (!UserSetting.getInstance().isDeaf()) * (!this.member.isServerMuted) * (this.member.getVolume() / 100);
        audioBufferSourceNode.onended = () => {
            setTimeout(() => {
                if (!(this.member.name in members)) {
                    playNextTextReading();
                    return;
                }
                if (this.member.speakingFlag) {
                    adjustmentMemberVolumeSliderBackGround(this.member.volumeRangeElement, "rgba(0, 255, 157, 0.32)");
                } else {
                    adjustmentMemberVolumeSliderBackGround(this.member.volumeRangeElement, "rgba(94, 0, 255, 0.32)");
                }
                playNextTextReading();
            }, 200);
        };
        audioBufferSourceNode.connect(gainNode).connect(audioContext.destination);
        audioBufferSourceNode.start();
    }

}
