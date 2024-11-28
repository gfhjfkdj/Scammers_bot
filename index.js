const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');

// تحميل إعدادات البوت من ملف config.json
const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });
const scammers = {}; // تخزين قائمة النصابين في الذاكرة

// عند تشغيل البوت
client.once('ready', () => {
    console.log(`✅ Logged in as ${client.user.tag}!`);
});

// عند استقبال الأوامر
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName, options, member } = interaction;

    // التحقق من وجود الرتبة المطلوبة
    const hasRole = member.roles.cache.has(config.ALLOWED_ROLE_ID);

    if (commandName === 'add') {
        if (!hasRole) {
            await interaction.reply('❌ ليس لديك الصلاحيات لاستخدام هذا الأمر!');
            return;
        }

        const userId = options.getString('user_id');
        const evidence = options.getString('evidence');

        // التحقق من الرابط وصيغة الـ ID
        if (!userId || !evidence || !evidence.startsWith('http')) {
            await interaction.reply('❌ يرجى توفير ID صحيح للشخص ورابط دليل صالح يبدأ بـ `http`!');
            return;
        }

        if (scammers[userId]) {
            scammers[userId].reports += 1;
            scammers[userId].evidence.push(evidence); // إضافة دليل جديد إلى القائمة
            await interaction.reply(`🔴 المستخدم **${userId}** تم تحديث معلوماته!`);
        } else {
            scammers[userId] = { reports: 1, evidence: [evidence] }; // إضافة دليل أول
            await interaction.reply(`🟢 تم إضافة المستخدم **${userId}** إلى قائمة النصابين!`);
        }
    }

    if (commandName === 'check') {
        const userId = options.getString('user_id');

        if (userId) {
            if (!scammers[userId]) {
                await interaction.reply(`❌ لا يوجد معلومات عن المستخدم **${userId}**.`);
                return;
            }

            const data = scammers[userId];
            const embed = new EmbedBuilder()
                .setTitle(`📋 تفاصيل النصاب: ${userId}`)
                .setColor('#FF0000')
                .addFields(
                    { name: '🔹 ID:', value: userId, inline: true },
                    { name: '📊 عدد البلاغات:', value: `${data.reports}`, inline: true },
                    { name: '📎 الأدلة:', value: `${data.evidence.map((link, index) => `\n${index + 1}. [دليل ${index + 1}](${link})`).join('')}`, inline: false }
                )
                .setTimestamp();

            await interaction.reply({
                embeds: [embed],
            });
        } else {
            if (Object.keys(scammers).length === 0) {
                await interaction.reply('📋 لا توجد بيانات عن نصابين.');
                return;
            }

            const embed = new EmbedBuilder()
                .setTitle('📋 قائمة النصابين')
                .setColor('#FF0000')
                .setTimestamp();

            for (const [userId, data] of Object.entries(scammers)) {
                embed.addFields({
                    name: `🔹 ID: ${userId}`,
                    value: `- **عدد البلاغات**: ${data.reports}\n- [📎 دليل](${data.evidence[0]})`,
                });
            }

            await interaction.reply({ embeds: [embed] });
        }
    }

    if (commandName === 'remove') {
        if (!hasRole) {
            await interaction.reply('❌ ليس لديك الصلاحيات لاستخدام هذا الأمر!');
            return;
        }

        const userId = options.getString('user_id');

        if (!userId || !scammers[userId]) {
            await interaction.reply('❌ المستخدم غير موجود في القائمة!');
            return;
        }

        delete scammers[userId];
        await interaction.reply(`✅ تم حذف المستخدم **${userId}** من القائمة.`);
    }
});

// تسجيل الأوامر
client.on('ready', async () => {
    const guild = client.guilds.cache.first();
    if (!guild) return;

    const commands = guild.commands;

    await commands.create({
        name: 'add',
        description: 'إضافة نصاب إلى القائمة',
        options: [
            {
                name: 'user_id',
                type: 3,
                description: 'ID الشخص',
                required: true,
            },
            {
                name: 'evidence',
                type: 3,
                description: 'رابط الدليل (يجب أن يبدأ بـ http)',
                required: true,
            },
        ],
    });

    await commands.create({
        name: 'check',
        description: 'عرض قائمة النصابين أو تفاصيل عن شخص معين',
        options: [
            {
                name: 'user_id',
                type: 3,
                description: 'ID الشخص (اختياري لعرض الجميع)',
                required: false,
            },
        ],
    });

    await commands.create({
        name: 'remove',
        description: 'حذف نصاب من القائمة',
        options: [
            {
                name: 'user_id',
                type: 3,
                description: 'ID الشخص المراد حذفه',
                required: true,
            },
        ],
    });

    console.log('✅ Commands registered!');
});

client.login(config.DISCORD_TOKEN);
