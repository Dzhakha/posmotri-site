export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        // Безопасный парсинг тела запроса (даже если данные пришли как строка)
        let body = req.body;
        if (typeof body === 'string') {
            body = JSON.parse(body);
        }

        const { textMessage, audioBase64, photos } = body || {};

        // Получаем переменные окружения
        const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
        const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

        if (!BOT_TOKEN || !CHAT_ID) {
            console.error('Ошибка: не заданы TELEGRAM_BOT_TOKEN или TELEGRAM_CHAT_ID в переменных окружения Vercel');
            return res.status(500).json({ error: 'Server configuration error: missing tokens' });
        }

        if (!textMessage) {
            return res.status(400).json({ error: 'Missing textMessage parameter' });
        }

        // 1. Отправка текстового сообщения в Telegram
        const textResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                text: textMessage,
                parse_mode: 'Markdown'
            })
        });

        const textResult = await textResponse.json();
        if (!textResult.ok) {
            console.error('Ошибка от Telegram API:', textResult);
            return res.status(400).json({ error: `Telegram API error: ${textResult.description}` });
        }

        // 2. Отправка фотографий (если они есть)
        if (photos && Array.isArray(photos) && photos.length > 0) {
            for (let i = 0; i < photos.length; i++) {
                try {
                    const base64Data = photos[i].replace(/^data:image\/jpeg;base64,/, '');
                    const buffer = Buffer.from(base64Data, 'base64');

                    const boundary = 'Boundary-' + Math.random().toString(36).substring(2);
                    const header = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="photo"; filename="photo_${i+1}.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`);
                    const footer = Buffer.from(`\r\n--${boundary}--\r\n`);
                    const multipartBody = Buffer.concat([header, buffer, footer]);

                    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto?chat_id=${CHAT_ID}`, {
                        method: 'POST',
                        headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
                        body: multipartBody
                    });
                } catch (photoErr) {
                    console.error(`Ошибка при отправке фото #${i}:`, photoErr);
                }
            }
        }

        // 3. Отправка голосового сообщения (если оно есть)
        if (audioBase64) {
            try {
                const audioData = audioBase64.replace(/^data:audio\/webm;base64,/, '');
                const audioBuffer = Buffer.from(audioData, 'base64');

                const boundary = 'Boundary-' + Math.random().toString(36).substring(2);
                const header = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="voice"; filename="record.webm"\r\nContent-Type: audio/webm\r\n\r\n`);
                const footer = Buffer.from(`\r\n--${boundary}--\r\n`);
                const multipartBody = Buffer.concat([header, audioBuffer, footer]);

                await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendVoice?chat_id=${CHAT_ID}`, {
                    method: 'POST',
                    headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
                    body: multipartBody
                });
            } catch (audioErr) {
                console.error('Ошибка при отправке аудио:', audioErr);
            }
        }

        return res.status(200).json({ success: true, message: 'Данные успешно доставлены в Telegram!' });

    } catch (error) {
        console.error('Критическая ошибка в serverless function:', error);
        return res.status(500).json({ error: error.message });
    }
}
