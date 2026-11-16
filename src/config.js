// Settings of the talk, shared by the deck (src/main.js) and the scripts.

export default {
    // Length of the talk in minutes. The speaker view paces the talk against
    // it with the data-timing of each slide (in seconds), and `vp run timing`
    // checks that the timings add up to it.
    talkMinutes: 10,

    // Reading pace of the speaker notes, used by `vp run timing` to estimate
    // how long the notes of each slide take to say.
    wordsPerMinute: 130,
};
