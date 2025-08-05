# 🤖 GizeBets Telegram Bot Admin Commands

## 📋 Overview

The GizeBets system includes a powerful Telegram bot command system using **Sportbot (@Africansportbot)** that allows administrators to manually trigger various actions through simple chat commands. This system follows official Telegram Bot API standards and includes proper admin verification.

## 🛡️ Security Features

- **Admin-only access**: Only configured admin users can execute commands
- **User ID verification**: Commands verify Telegram user IDs against an admin whitelist
- **Error handling**: Comprehensive error handling and logging
- **Rate limiting**: Built-in protection against command spam

## ⚙️ Setup Instructions

### 1. Get Your Telegram User ID
1. Open Telegram and search for `@userinfobot`
2. Send any message to the bot
3. Copy your **User ID** (numeric value)

### 2. Configure Admin Users
Add your Telegram User ID to the `.env` file:
```env
ADMIN_USER_IDS=123456789,987654321
```
*Note: Use comma-separated values for multiple admins*

### 3. Start the Bot Commands System
1. Go to the dashboard at `http://localhost:3000`
2. Click **🤖 Bot Commands** to open the bot management panel
3. Click **🚀 Start Bot Commands** to activate the system
4. Verify the status shows **✅ Active**

## 📱 Available Commands

**Total Commands:** 17 (All with API endpoints!)

### 🎁 Promotional Commands

#### `/sendpromo [category]`
Sends a promotional message immediately.

**Usage:**
```
/sendpromo football
/sendpromo general
```

**Example:**
```
🎁 Sending promotional message...
✅ Promotional message sent successfully!
📧 Message ID: 12345
🎯 Category: football
⏰ Sent at: 1/10/2025, 3:30:45 PM
```

#### `/sendbonus ALL "message"`
Broadcasts a bonus code message to all users.

**Usage:**
```
/sendbonus ALL "Use code WIN10 now 🎁"
/sendbonus ALL "Special weekend bonus: WEEKEND20!"
```

**Example:**
```
💰 Sending bonus message...
✅ Bonus message sent successfully!
📧 Message ID: 12346
🎯 Target: ALL
💬 Message: "Use code WIN10 now 🎁"
⏰ Sent at: 1/10/2025, 3:31:22 PM
```

### ⚽ Content Commands

#### `/predictions`
Manually sends match predictions for today's top matches.

**Usage:**
```
/predictions
```

**Example:**
```
⚽ Generating match predictions...
✅ Predictions sent successfully!
📧 Message ID: 12347
🎯 Matches: 5
📊 Data Quality: Enhanced
⏰ Sent at: 2024-01-10T15:32:00Z
```

#### `/results`
Sends yesterday's match results.

**Usage:**
```
/results
```

**Example:**
```
📊 Generating match results...
✅ Results sent successfully!
📧 Message ID: 12348
📊 Results: 8
⏰ Sent at: 2024-01-10T15:33:15Z
```

### ⚽ Live Match Management

#### `/active_matches`
Show currently active (live) matches.

**Usage:**
```
/active_matches
```

**Example:**
```
🔴 ACTIVE MATCHES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚽ Live Now: 3
• Arsenal vs Chelsea - 67' (Premier League)
• Barcelona vs Real Madrid - 23' (La Liga)
• Bayern vs Dortmund - 89' (Bundesliga)

🎯 Do you want to send LIVE predictions to the channel?
[✅ Send Live Predictions] [❌ Just Show Info]
```

#### `/upcoming_matches`
Show matches starting in the next 2-3 hours.

**Usage:**
```
/upcoming_matches
```

**Example:**
```
⏰ UPCOMING MATCHES (Next 2-3 hours)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Found: 5
• Manchester United vs Liverpool - 3:00 PM (Premier League)
• PSG vs Monaco - 4:30 PM (Ligue 1)
• Juventus vs Inter - 5:00 PM (Serie A)

🎯 Do you want to send predictions for these matches?
[✅ Send Predictions] [❌ Just Show Info]
```

#### `/today_matches`
Complete overview of today's matches with content schedule.

**Usage:**
```
/today_matches
```

**Example:**
```
📅 TODAY'S MATCHES & CONTENT SCHEDULE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Summary:
• Total Matches: 12
• Live Now: 2
• Upcoming: 5
• Ready to Send: 3
• Scheduled: 4
• Overdue: 1

🚨 READY TO SEND NOW:
• Chelsea vs Arsenal - prediction
• Barcelona vs Real Madrid - result

⏰ NEXT SCHEDULED:
• Manchester United vs Liverpool
  Type: prediction | Time: 1:00 PM (2h)
```

#### `/send_live`
Manually trigger live match predictions.

**Usage:**
```
/send_live
```

#### `/live_results`
Post results for recently finished matches.

**Usage:**
```
/live_results
```

### 🤖 Automation Control

#### `/automation`
Full automation control panel.

**Usage:**
```
/automation
```

**Example:**
```
🤖 AUTOMATION CONTROL PANEL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Overall Status: ✅ Enabled
🔄 Health: ✅ Healthy
❌ Failures: 0/3

📋 Active Automations:
• Predictions: ✅ (24 runs)
• Results: ✅ (12 runs)
• Promos: ✅ (18 runs)
• Analytics: ✅ (7 runs)

Choose an action:
[🛑 Disable All] [⏰ Edit Schedule]
[🔄 Reset Failures] [📊 View Details]
```

#### `/schedule`
Manage posting schedule with match-based timing.

**Usage:**
```
/schedule
```

**Example:**
```
⏰ POSTING SCHEDULE MANAGER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Current Status:
• Live Matches: 2
• Upcoming Predictions: 5
• Upcoming Results: 3
• Queued Manual: 1

⏰ Next Action:
• Arsenal vs Chelsea
• Type: prediction
• In: 87 minutes

⚙️ Settings:
• Daily Schedule: ✅
• Match-based: ✅
• Total Items: 12
```

#### `/settings`
System configuration management.

**Usage:**
```
/settings
```

**Example:**
```
⚙️ SYSTEM CONFIGURATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📺 Channel: @gizebetgames
🤖 Bot: @Africansportbot
🌐 Timezone: Africa/Addis_Ababa
🔑 API Status: 🟢 Online
💬 Language: Amharic

⚙️ Current Settings:
• Auto-posting: ✅
• Hours before match: 2
• Generate images: ✅
• API timeout: 30s

Choose a setting to modify:
[⚙️ Auto-posting] [⏰ Match Timing]
[🎨 Image Generation] [🌍 Timezone]
```

### 🎫 Management Tools

#### `/coupons`
Comprehensive coupon management system.

**Usage:**
```
/coupons
```

**Example:**
```
🎫 COUPONS MANAGEMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Overview:
• Total Coupons: 15
• Active Coupons: 8
• Expired Coupons: 3

🏷️ Recent Coupons:
• FOOTBALL100 - 100% bonus (✅ Active)
• WEEKEND20 - 20% bonus (✅ Active)
• SPECIAL50 - 50% bonus (⏰ Expired)

🎯 Choose an action:
[➕ Create Coupon] [📋 View All]
[✅ Active Only] [⏰ Expired Only]
```

### 🔧 System Commands

#### `/status`
Get current system status and uptime information.

**Usage:**
```
/status
```

**Example:**
```
📈 GizeBets System Status

🤖 Bot Status: ✅ Active
⏰ Uptime: 2h 34m
📊 Stats: {"predictions": 5, "results": 3}
🌍 Ethiopian Time: 1/10/2025, 6:33:45 PM
🔗 System URL: https://your-domain.vercel.app
```

#### `/stop`
Stop all system processes including bot commands.

**Usage:**
```
/stop
```

**Example:**
```
🛑 Stopping system processes...
✅ System stopped successfully!
🛑 Main System: Stopped
🤖 Bot Commands: Bot commands stopped successfully
⏰ Stopped at: 08/05/2025, 02:59:43 PM

💡 Use /restart or the dashboard to restart the system.
```

#### `/restart`
Restart the bot commands system.

**Usage:**
```
/restart
```

**Example:**
```
🔄 Restarting bot commands...
✅ Bot commands restarted successfully!
🤖 Status: Active
🔄 Previous state: Active
⏰ Restarted at: 08/05/2025, 03:02:15 PM

📝 Bot commands restarted successfully
```

#### `/help`
Shows the complete admin control panel.

**Usage:**
```
/help
```

**Example:**
```
🟢 GIZEBETS ADMIN CONTROL PANEL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👋 Welcome Admin! Choose a section to manage:

📊 System Status: 🟢 Online
⏱️ Uptime: 2h 45m
🔄 API Errors: 0
📺 Channel: @gizebetgames
🤖 Bot: @Africansportbot

[⚽ Send Predictions] [🎁 Send Promo]
[🔴 Live Matches] [⏰ Upcoming Matches]
[📅 Today Matches] [📊 Post Results]
[🤖 Automation] [⏰ Schedule]
[⚙️ Settings] [📊 Analytics]
[🎫 Coupons] [🎁 Bonus Codes]
[🛑 Stop System] [🔄 Restart]
```

## 🚀 Technical Implementation

### Command Registration
Commands are automatically registered with Telegram using the `setMyCommands` API:

```javascript
const commands = [
  { command: 'sendpromo', description: '🎁 Send promotional message immediately' },
  { command: 'sendbonus', description: '💰 Send bonus code to all users' },
  { command: 'predictions', description: '⚽ Send match predictions manually' },
  { command: 'results', description: '📊 Send match results' },
  { command: 'status', description: '📈 Get system status' },
  { command: 'help', description: '❓ Show all available commands' }
];

await bot.setMyCommands(commands);
```

### Admin Verification
Every command includes admin verification:

```javascript
checkAdminAccess(msg) {
  const userId = msg.from.id;
  if (!this.adminUsers.includes(userId)) {
    this.bot.sendMessage(msg.chat.id, '🚫 Access denied. Admin only.');
    return false;
  }
  return true;
}
```

### Error Handling
Comprehensive error handling for all scenarios:

```javascript
this.bot.on('polling_error', (error) => {
  console.error('❌ Polling error:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection:', reason);
});
```

## 🔍 Troubleshooting

### Common Issues

**❌ "Access denied" message**
- Verify your Telegram User ID is in `ADMIN_USER_IDS`
- Restart the bot commands system after updating .env
- Check that you're messaging the correct bot

**❌ Commands not working**
- Ensure bot commands are started in the dashboard
- Check that `TELEGRAM_BOT_TOKEN` is correct
- Verify bot has permission to send messages to the channel

**❌ "Bot commands are already stopped"**
- Use the dashboard to start the bot commands system
- Check system logs for error messages
- Verify all environment variables are set correctly

### Logs and Monitoring

The system provides detailed logging:
- All command executions are logged with user info
- API call results are tracked and displayed
- Error messages include full context for debugging

## 📊 Dashboard Integration

The bot commands system integrates with the main dashboard:

- **Status Display**: Real-time bot status and admin count
- **Control Buttons**: Start/stop bot commands with one click
- **Command List**: Visual display of all available commands
- **Configuration Help**: Step-by-step setup instructions

## 🎯 Best Practices

1. **Test Commands**: Always test commands in a private chat first
2. **Monitor Usage**: Check dashboard regularly for command activity
3. **Admin Management**: Keep the admin list updated and secure
4. **Error Monitoring**: Check logs for any command failures
5. **Regular Updates**: Restart bot commands when updating configurations

## 🔒 Security Considerations

- Admin user IDs should be kept private and secure
- Bot token should never be shared or exposed
- Monitor command usage for suspicious activity
- Regularly review and update admin access lists
- Use environment variables for all sensitive configuration

---

**Ready to use your GizeBots admin commands!** 🚀

For additional support or feature requests, check the dashboard status or system logs.