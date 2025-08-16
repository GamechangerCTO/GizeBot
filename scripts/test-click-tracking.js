#!/usr/bin/env node

/**
 * Test script to verify click tracking functionality after channel_id fixes
 */

const { supabase } = require('../lib/supabase');

async function testClickTracking() {
  console.log('🧪 Testing click tracking system...\n');

  if (!supabase) {
    console.error('❌ Supabase not configured');
    process.exit(1);
  }

  try {
    // 1. Test button_analytics table structure
    console.log('1️⃣ Testing button_analytics table...');
    const { data: analytics, error: analyticsError } = await supabase
      .from('button_analytics')
      .select('*')
      .limit(5);
    
    if (analyticsError) {
      console.error('❌ Error accessing button_analytics:', analyticsError.message);
    } else {
      console.log(`✅ button_analytics table accessible, ${analytics.length} recent entries`);
      if (analytics.length > 0) {
        const sample = analytics[0];
        console.log('   Sample entry structure:', Object.keys(sample));
        console.log('   Has channel_id:', 'channel_id' in sample);
      }
    }

    // 2. Test users table with channel_id
    console.log('\n2️⃣ Testing users table channel_id support...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('user_id, channel_id')
      .limit(10);
    
    if (usersError) {
      console.error('❌ Error accessing users table:', usersError.message);
    } else {
      console.log(`✅ Users table accessible, ${users.length} entries`);
      const channelStats = users.reduce((acc, user) => {
        const channel = user.channel_id || 'null';
        acc[channel] = (acc[channel] || 0) + 1;
        return acc;
      }, {});
      console.log('   Channel distribution:', channelStats);
    }

    // 3. Test environment variables
    console.log('\n3️⃣ Testing environment configuration...');
    const channelSources = [
      process.env.CHANNEL_DB_UUID,
      process.env.SUPABASE_DEFAULT_CHANNEL_ID,
      process.env.CHANNEL_ID
    ].filter(Boolean);
    
    if (channelSources.length === 0) {
      console.warn('⚠️  No channel environment variables configured');
      console.log('   Consider setting: CHANNEL_DB_UUID, SUPABASE_DEFAULT_CHANNEL_ID, or CHANNEL_ID');
    } else {
      console.log('✅ Channel environment variables found:');
      channelSources.forEach((source, i) => {
        console.log(`   ${i + 1}. ${source}`);
      });
    }

    // 4. Test recent clicks
    console.log('\n4️⃣ Testing recent click tracking...');
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recentClicks, error: clicksError } = await supabase
      .from('button_analytics')
      .select('user_id, channel_id, clicked_at, analytics_tag')
      .gte('clicked_at', yesterday)
      .order('clicked_at', { ascending: false })
      .limit(10);
    
    if (clicksError) {
      console.error('❌ Error accessing recent clicks:', clicksError.message);
    } else {
      console.log(`✅ Recent clicks (last 24h): ${recentClicks.length}`);
      if (recentClicks.length > 0) {
        const withChannelId = recentClicks.filter(c => c.channel_id).length;
        console.log(`   With channel_id: ${withChannelId}/${recentClicks.length}`);
        console.log('   Sample recent click:', {
          user_id: recentClicks[0].user_id,
          channel_id: recentClicks[0].channel_id,
          analytics_tag: recentClicks[0].analytics_tag
        });
      }
    }

    // 5. Summary and recommendations
    console.log('\n📊 Summary and Recommendations:');
    
    if (analytics && analytics.length > 0 && 'channel_id' in analytics[0]) {
      console.log('✅ Click tracking system appears to be working correctly');
    } else {
      console.log('⚠️  Click tracking may need schema updates');
    }
    
    if (channelSources.length > 0) {
      console.log('✅ Channel identification configured');
    } else {
      console.log('⚠️  Configure channel environment variables for better tracking');
    }
    
    console.log('\n🎯 Next steps:');
    console.log('1. Run the migration: migrations/add_channel_id_to_users.sql');
    console.log('2. Set environment variables: CHANNEL_DB_UUID or SUPABASE_DEFAULT_CHANNEL_ID');
    console.log('3. Test a real click through the redirect endpoint');
    console.log('4. Monitor the analytics dashboard for click data');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testClickTracking().then(() => {
  console.log('\n✅ Click tracking test completed!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});