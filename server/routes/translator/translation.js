// server/routes/translator/translation.js
const express   = require('express');
const axios     = require('axios');
const googleTTS = require('google-tts-api');
const googleTranslateApi = require('@vitalets/google-translate-api');
const translate =
    typeof googleTranslateApi === 'function'
        ? googleTranslateApi
        : googleTranslateApi.translate;

const router = express.Router();

router.post('/', async (req, res) => {
    const { text, targetLang } = req.body;
    if (!text || !targetLang) {
        return res.status(400).json({ success:false, error:"'text' and 'targetLang' are required" });
    }

    const toCode = targetLang.split('-')[0]; // e.g. 'mr-IN'→'mr'
    let translated;
    try {
        translated = (await translate(text, { to: toCode })).text;
    } catch (err) {
        console.error('Translation failed:', err);
        return res.status(500).json({ success:false, error:'Translation failed' });
    }

    // Prepare audio URLs
    let urls;
    try {
        if (translated.length <= 200) {
            urls = [
                googleTTS.getAudioUrl(translated, {
                    lang: toCode,
                    slow: false,
                    host: 'https://translate.google.com',
                })
            ];
        } else {
            urls = googleTTS.getAllAudioUrls(translated, {
                lang: toCode,
                slow: false,
                host: 'https://translate.google.com',
            }).map(obj => obj.url);
        }
    } catch (err) {
        console.error('TTS URL generation failed:', err);
        return res.status(500).json({ success:false, error:'TTS URL generation failed' });
    }

    // Stream each URL sequentially
    res.setHeader('Content-Type', 'audio/mpeg');
    try {
        for (let i = 0; i < urls.length; i++) {
            const responseStream = await axios.get(urls[i], { responseType: 'stream' });
            // Pipe into res without ending
            await new Promise((resolve, reject) => {
                responseStream.data
                    .on('end', resolve)
                    .on('error', reject)
                    .pipe(res, { end: false });
            });
        }
        res.end();
    } catch (err) {
        console.error('TTS fetch/stream failed:', err);
        if (!res.headersSent) {
            res.status(500).json({ success:false, error:'TTS fetch failed' });
        } else {
            res.end();
        }
    }
});

module.exports = router;
