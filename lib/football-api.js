// Football API Integration for GizeBets
// Fetches match data from multiple sources

const axios = require('axios');

class FootballAPI {
  constructor() {
    this.apiFootballKey = process.env.API_FOOTBALL_KEY;
    this.rapidApiKey = process.env.RAPID_API_KEY;
    
    // Check if using direct API-Football or RapidAPI
    this.isDirect = process.env.API_FOOTBALL_DIRECT === 'true';
    this.baseUrl = this.isDirect 
      ? 'https://v3.football.api-sports.io'
      : 'https://api-football-v1.p.rapidapi.com/v3';
  }

  // Get today's important matches from top leagues
  async getTodayMatches() {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Top European Leagues (API-Football IDs from official documentation)
      const topLeagues = [
        39,  // Premier League
        140, // La Liga  
        135, // Serie A
        78,  // Bundesliga
        61,  // Ligue 1
        2    // Champions League
      ];
      
      const matches = [];
      
      for (const leagueId of topLeagues) {
        try {
          // Add delay between requests to respect rate limits (API-Football documentation)
          if (matches.length > 0) {
            await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
          }

          const headers = this.isDirect 
            ? { 'x-apisports-key': this.apiFootballKey }
            : { 
                'X-RapidAPI-Key': this.apiFootballKey,
                'X-RapidAPI-Host': 'api-football-v1.p.rapidapi.com'
              };

          const response = await axios.get(`${this.baseUrl}/fixtures`, {
            headers,
            params: {
              league: leagueId,
              date: today,
              season: new Date().getFullYear()
            },
            timeout: 10000, // 10 second timeout
            httpsAgent: new (require('https').Agent)({
              keepAlive: true,
              rejectUnauthorized: true
            })
          });
          
          if (response.data.response) {
            matches.push(...response.data.response);
          }
        } catch (error) {
          console.log(`Error fetching league ${leagueId}:`, error.message);
          
          // Handle different API-Football error types based on documentation
          if (error.response) {
            const status = error.response.status;
            const data = error.response.data;
            
            switch (status) {
              case 403:
                console.log('🚨 API-Football: Invalid API key or unauthorized access');
                break;
              case 429:
                console.log('⚠️ API-Football: Rate limit exceeded. Please wait before making more requests');
                break;
              case 404:
                console.log('📅 API-Football: No fixtures found for this league/date');
                break;
              case 500:
                console.log('🔧 API-Football: Server error, please try again later');
                break;
              default:
                console.log(`❌ API-Football: HTTP ${status} - ${data?.message || 'Unknown error'}`);
            }
          } else {
            console.log('🌐 Network error connecting to API-Football');
          }
        }
      }
      
      if (matches.length === 0) {
        console.log('⚠️ No matches from API, using fallback data for testing...');
        return this.getFallbackMatches();
      }
      
      return this.selectTop5Matches(matches);
    } catch (error) {
      console.error('Error fetching today matches:', error);
      return this.getFallbackMatches(); // Use fallback instead of throwing
    }
  }

  // Get yesterday's results
  async getYesterdayResults() {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      // Top European Leagues (API-Football IDs from official documentation)
      const topLeagues = [
        39,  // Premier League
        140, // La Liga  
        135, // Serie A
        78,  // Bundesliga
        61,  // Ligue 1
        2    // Champions League
      ];
      const results = [];
      
      for (const leagueId of topLeagues) {
        try {
          // Add delay between requests to respect rate limits (API-Football documentation)
          if (results.length > 0) {
            await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
          }

          const headers = this.isDirect 
            ? { 'x-apisports-key': this.apiFootballKey }
            : { 
                'X-RapidAPI-Key': this.apiFootballKey,
                'X-RapidAPI-Host': 'api-football-v1.p.rapidapi.com'
              };

          const response = await axios.get(`${this.baseUrl}/fixtures`, {
            headers,
            params: {
              league: leagueId,
              date: yesterdayStr,
              status: 'FT', // Finished
              season: new Date().getFullYear()
            },
            timeout: 10000, // 10 second timeout
            httpsAgent: new (require('https').Agent)({
              keepAlive: true,
              rejectUnauthorized: true
            })
          });
          
          if (response.data.response) {
            results.push(...response.data.response);
          }
        } catch (error) {
          console.log(`Error fetching league ${leagueId} results:`, error.message);
          
          // Handle different API-Football error types based on documentation
          if (error.response) {
            const status = error.response.status;
            const data = error.response.data;
            
            switch (status) {
              case 403:
                console.log('🚨 API-Football: Invalid API key or unauthorized access');
                break;
              case 429:
                console.log('⚠️ API-Football: Rate limit exceeded. Please wait before making more requests');
                break;
              case 404:
                console.log('📅 API-Football: No results found for this league/date');
                break;
              case 500:
                console.log('🔧 API-Football: Server error, please try again later');
                break;
              default:
                console.log(`❌ API-Football: HTTP ${status} - ${data?.message || 'Unknown error'}`);
            }
          } else {
            console.log('🌐 Network error connecting to API-Football');
          }
        }
      }
      
      if (results.length === 0) {
        console.log('⚠️ No results from API, using fallback data for testing...');
        return this.getFallbackResults();
      }
      
      return this.processResults(results);
    } catch (error) {
      console.error('Error fetching yesterday results:', error);
      return this.getFallbackResults(); // Use fallback instead of throwing
    }
  }

  // Smart selection of Top 5 matches based on multiple criteria
  selectTop5Matches(matches) {
    console.log(`🔍 Analyzing ${matches.length} matches for Top 5 selection...`);
    
    // Score each match based on multiple criteria
    const scoredMatches = matches
      .filter(match => match.fixture.status.short === 'NS' || match.fixture.status.short === 'TBD')
      .map(match => ({
        ...match,
        score: this.calculateMatchScore(match)
      }))
      .sort((a, b) => b.score - a.score) // Sort by score descending
      .slice(0, 5); // Take top 5

    console.log('📊 Top 5 selected matches:');
    scoredMatches.forEach((match, index) => {
      console.log(`${index + 1}. ${match.teams.home.name} vs ${match.teams.away.name} (Score: ${match.score})`);
    });

    return this.processMatches(scoredMatches);
  }

  // Calculate match importance score
  calculateMatchScore(match) {
    let score = 0;
    
    // League importance (Champions League = highest, then top 5 leagues)
    const leagueScores = {
      'UEFA Champions League': 100,
      'Premier League': 90,
      'La Liga': 85,
      'Serie A': 80,
      'Bundesliga': 75,
      'Ligue 1': 70
    };
    
    score += leagueScores[match.league.name] || 50;
    
    // Team reputation (based on common big teams)
    const bigTeams = [
      'Real Madrid', 'Barcelona', 'Manchester City', 'Manchester United',
      'Liverpool', 'Arsenal', 'Chelsea', 'Tottenham Hotspur',
      'Bayern Munich', 'Borussia Dortmund', 'Paris Saint-Germain',
      'Juventus', 'AC Milan', 'Inter Milan', 'Napoli',
      'Atletico Madrid', 'Arsenal', 'PSG'
    ];
    
    const homeTeamBig = bigTeams.some(team => match.teams.home.name.includes(team));
    const awayTeamBig = bigTeams.some(team => match.teams.away.name.includes(team));
    
    if (homeTeamBig) score += 25;
    if (awayTeamBig) score += 25;
    if (homeTeamBig && awayTeamBig) score += 30; // Derby bonus
    
    // Time preference (afternoon/evening matches get higher score)
    const matchHour = new Date(match.fixture.date).getHours();
    if (matchHour >= 14 && matchHour <= 21) {
      score += 15; // Prime time bonus
    }
    
    // Stage importance (round information)
    if (match.league.round && (
      match.league.round.includes('Final') || 
      match.league.round.includes('Semi') ||
      match.league.round.includes('Quarter')
    )) {
      score += 40;
    }
    
    return score;
  }

  processMatches(matches) {
    return matches
      .filter(match => match.fixture.status.short === 'NS' || match.fixture.status.short === 'TBD')
      .map(match => ({
        id: match.fixture.id,
        homeTeam: {
          id: match.teams.home.id,
          name: match.teams.home.name,
          shortName: match.teams.home.name,
          crest: match.teams.home.logo
        },
        awayTeam: {
          id: match.teams.away.id,
          name: match.teams.away.name,
          shortName: match.teams.away.name,
          crest: match.teams.away.logo
        },
        competition: {
          id: match.league.id,
          name: match.league.name,
          code: match.league.name,
          type: 'LEAGUE',
          emblem: match.league.logo
        },
        season: match.league.season,
        kickoffTime: new Date(match.fixture.date),
        venue: match.fixture.venue?.name || 'TBD',
        stage: match.stage,
        group: match.group,
        lastUpdated: match.lastUpdated,
        odds: match.odds || null,
        referees: match.referees || []
      }))
      .sort((a, b) => a.kickoffTime - b.kickoffTime)
      .slice(0, 5); // Top 5 matches
  }

  processResults(matches) {
    return matches
      .filter(match => match.fixture.status.short === 'FT')
      .map(match => ({
        homeTeam: match.teams.home.name,
        awayTeam: match.teams.away.name,
        homeScore: match.goals.home,
        awayScore: match.goals.away,
        competition: match.league.name
      }));
  }

  // Get match timing information for dynamic scheduling
  getMatchTimings(matches) {
    if (!matches || matches.length === 0) return null;
    
    const timings = matches.map(match => ({
      id: match.id,
      kickoffTime: match.kickoffTime,
      timeUntilKickoff: (match.kickoffTime - new Date()) / (1000 * 60), // minutes
      teams: `${match.homeTeam} vs ${match.awayTeam}`
    }));
    
    // Sort by kickoff time
    timings.sort((a, b) => a.kickoffTime - b.kickoffTime);
    
    return {
      nextMatch: timings[0],
      allMatches: timings,
      shouldPostPredictions: timings.some(t => t.timeUntilKickoff > 60 && t.timeUntilKickoff < 240), // 1-4 hours before
      shouldPostResults: timings.some(t => t.timeUntilKickoff < -90) // 1.5 hours after kickoff
    };
  }

  // Get detailed team data for predictions
  async getTeamData(teamId, teamName) {
    try {
      console.log(`🔍 Getting detailed data for team: ${teamName} (ID: ${teamId})`);
      
      // Get team's recent matches for form analysis (last 10 matches)
      const response = await axios.get(`${this.baseUrl}/fixtures`, {
        headers: {
          'X-RapidAPI-Key': this.apiFootballKey,
          'X-RapidAPI-Host': 'api-football-v1.p.rapidapi.com'
        },
        params: {
          team: teamId,
          last: 10,
          status: 'FT'
        }
      });
      
      const recentMatches = response.data.response || [];
      
      // Calculate team statistics
      const stats = this.calculateTeamStats(recentMatches, teamName);
      
      return {
        id: teamId,
        name: teamName,
        recentMatches: recentMatches.slice(0, 5), // Last 5 matches
        stats: stats,
        form: this.calculateForm(recentMatches, teamName),
        lastUpdated: new Date().toISOString()
      };
      
    } catch (error) {
      console.error(`Error getting team data for ${teamName}:`, error);
      return null;
    }
  }

  // Calculate team statistics from recent matches
  calculateTeamStats(matches, teamName) {
    let wins = 0, draws = 0, losses = 0;
    let goalsFor = 0, goalsAgainst = 0;
    let homeWins = 0, awayWins = 0;
    
    matches.forEach(match => {
      const isHome = match.teams.home.name === teamName;
      const homeScore = match.goals.home;
      const awayScore = match.goals.away;
      
      if (isHome) {
        goalsFor += homeScore;
        goalsAgainst += awayScore;
        if (homeScore > awayScore) { wins++; homeWins++; }
        else if (homeScore === awayScore) draws++;
        else losses++;
      } else {
        goalsFor += awayScore;
        goalsAgainst += homeScore;
        if (awayScore > homeScore) { wins++; awayWins++; }
        else if (awayScore === homeScore) draws++;
        else losses++;
      }
    });
    
    const totalMatches = matches.length;
    
    return {
      totalMatches,
      wins,
      draws,
      losses,
      goalsFor,
      goalsAgainst,
      goalDifference: goalsFor - goalsAgainst,
      averageGoalsFor: totalMatches > 0 ? (goalsFor / totalMatches).toFixed(2) : 0,
      averageGoalsAgainst: totalMatches > 0 ? (goalsAgainst / totalMatches).toFixed(2) : 0,
      winPercentage: totalMatches > 0 ? ((wins / totalMatches) * 100).toFixed(1) : 0,
      homeWins,
      awayWins,
      cleanSheets: matches.filter(m => {
        const isHome = m.teams.home.name === teamName;
        return isHome ? m.goals.away === 0 : m.goals.home === 0;
      }).length
    };
  }

  // Calculate team form (last 5 matches)
  calculateForm(matches, teamName) {
    const last5 = matches.slice(0, 5);
    const form = last5.map(match => {
      const isHome = match.teams.home.name === teamName;
      const homeScore = match.goals.home;
      const awayScore = match.goals.away;
      
      if (isHome) {
        if (homeScore > awayScore) return 'W';
        if (homeScore === awayScore) return 'D';
        return 'L';
      } else {
        if (awayScore > homeScore) return 'W';
        if (awayScore === homeScore) return 'D';
        return 'L';
      }
    });
    
    return form.join('');
  }

  // Get head-to-head data between two teams
  async getHeadToHeadData(homeTeamId, awayTeamId, homeTeamName, awayTeamName) {
    try {
      console.log(`🆚 Getting head-to-head: ${homeTeamName} vs ${awayTeamName}`);
      
      // Get H2H matches using API-Football
      const response = await axios.get(`${this.baseUrl}/fixtures/headtohead`, {
        headers: {
          'X-RapidAPI-Key': this.apiFootballKey,
          'X-RapidAPI-Host': 'api-football-v1.p.rapidapi.com'
        },
        params: {
          h2h: `${homeTeamId}-${awayTeamId}`,
          last: 5, // Last 5 H2H matches
          status: 'FT'  // Finished matches only
        }
      });
      
      const h2hMatches = response.data.response || [];
      
      return {
        totalMatches: h2hMatches.length,
        matches: h2hMatches,
        homeTeamWins: h2hMatches.filter(match => {
          const homeWin = match.teams.home.id === homeTeamId && 
                         match.goals.home > match.goals.away;
          const awayWin = match.teams.away.id === homeTeamId && 
                         match.goals.away > match.goals.home;
          return homeWin || awayWin;
        }).length,
        draws: h2hMatches.filter(match => 
          match.goals.home === match.goals.away
        ).length
      };
      
    } catch (error) {
      console.error(`Error getting head-to-head data:`, error);
      return { totalMatches: 0, matches: [], homeTeamWins: 0, draws: 0 };
    }
  }

  // Enhanced match selection with detailed team data
  async getEnhancedTop5Matches() {
    try {
      const matches = await this.getTodayMatches();
      
      if (matches.length === 0) {
        throw new Error('No matches found for enhanced analysis');
      }
      
      // Get detailed team data for each match
      const enhancedMatches = await Promise.all(
        matches.map(async (match) => {
          const [homeTeamData, awayTeamData, h2hData] = await Promise.all([
            this.getTeamData(match.homeTeam.id, match.homeTeam.name),
            this.getTeamData(match.awayTeam.id, match.awayTeam.name),
            this.getHeadToHeadData(
              match.homeTeam.id, 
              match.awayTeam.id, 
              match.homeTeam.name, 
              match.awayTeam.name
            )
          ]);
          
          return {
            ...match,
            homeTeamData,
            awayTeamData,
            headToHead: h2hData,
            predictionFactors: this.generatePredictionFactors(homeTeamData, awayTeamData, h2hData)
          };
        })
      );
      
      console.log('✅ Enhanced match data ready for predictions');
      return enhancedMatches;
      
    } catch (error) {
      console.error('Error getting enhanced matches:', error);
      throw error;
    }
  }

  // Generate prediction factors for better AI analysis
  generatePredictionFactors(homeTeam, awayTeam, h2h) {
    if (!homeTeam || !awayTeam) {
      return {
        homeFormStrength: 'Unknown',
        awayFormStrength: 'Unknown',
        h2hTrend: 'No data',
        goalExpectancy: 'Unknown',
        riskLevel: 'High'
      };
    }
    
    const homeForm = homeTeam.stats.winPercentage;
    const awayForm = awayTeam.stats.winPercentage;
    
    return {
      homeFormStrength: homeForm > 60 ? 'Strong' : homeForm > 40 ? 'Average' : 'Poor',
      awayFormStrength: awayForm > 60 ? 'Strong' : awayForm > 40 ? 'Average' : 'Poor',
      h2hTrend: h2h.totalMatches > 0 ? 
        (h2h.homeTeamWins > h2h.totalMatches / 2 ? 'Home dominance' : 
         h2h.draws > h2h.totalMatches / 3 ? 'Balanced' : 'Away dominance') : 'No history',
      goalExpectancy: ((parseFloat(homeTeam.stats.averageGoalsFor) + parseFloat(awayTeam.stats.averageGoalsFor)) / 2).toFixed(1),
      riskLevel: homeForm > 50 && awayForm > 50 ? 'Medium' : 'Low',
      homeAdvantage: homeTeam.stats.homeWins / Math.max(homeTeam.stats.totalMatches / 2, 1) > 0.6
    };
  }

  // Check if there are any live matches
  async getLiveMatches() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const topLeagues = ['PL', 'PD', 'SA', 'BL1', 'FL1', 'CL'];
      const liveMatches = [];
      
      for (const league of topLeagues) {
        try {
          const response = await axios.get(`https://api.football-data.org/v4/competitions/${league}/matches`, {
            headers: {
              'X-Auth-Token': this.footballApiKey
            },
            params: {
              dateFrom: today,
              dateTo: today,
              status: 'IN_PLAY'
            }
          });
          
          if (response.data.matches) {
            liveMatches.push(...response.data.matches);
          }
        } catch (error) {
          console.log(`Error fetching live ${league}:`, error.message);
        }
      }
      
      return liveMatches.map(match => ({
        id: match.id,
        homeTeam: match.homeTeam.name,
        awayTeam: match.awayTeam.name,
        homeScore: match.score.fullTime.home || 0,
        awayScore: match.score.fullTime.away || 0,
        minute: match.minute || 0,
        competition: match.competition.name
      }));
      
    } catch (error) {
      console.error('Error fetching live matches:', error);
      return [];
    }
  }

  // Fallback matches for testing when API is unavailable
  getFallbackMatches() {
    console.log('🔄 Using fallback test matches...');
    const now = new Date();
    const in2Hours = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const in4Hours = new Date(now.getTime() + 4 * 60 * 60 * 1000);
    
    return [
      {
        homeTeam: { id: 33, name: 'Manchester United' },
        awayTeam: { id: 40, name: 'Liverpool' },
        kickoffTime: in2Hours,
        competition: { name: 'Premier League' },
        importance: 5
      },
      {
        homeTeam: { id: 529, name: 'Barcelona' },
        awayTeam: { id: 541, name: 'Real Madrid' },
        kickoffTime: in4Hours,
        competition: { name: 'La Liga' },
        importance: 5
      },
      {
        homeTeam: { id: 157, name: 'Bayern Munich' },
        awayTeam: { id: 165, name: 'Borussia Dortmund' },
        kickoffTime: in2Hours,
        competition: { name: 'Bundesliga' },
        importance: 4
      },
      {
        homeTeam: { id: 496, name: 'Juventus' },
        awayTeam: { id: 489, name: 'AC Milan' },
        kickoffTime: in4Hours,
        competition: { name: 'Serie A' },
        importance: 4
      },
      {
        homeTeam: { id: 85, name: 'PSG' },
        awayTeam: { id: 80, name: 'Lyon' },
        kickoffTime: in2Hours,
        competition: { name: 'Ligue 1' },
        importance: 3
      }
    ];
  }

  // Get currently live/active matches
  async getLiveMatches() {
    console.log('🔴 Fetching live matches from API-Football...');
    
    try {
      const headers = this.isDirect 
        ? { 'x-apisports-key': this.apiFootballKey }
        : { 
            'X-RapidAPI-Key': this.apiFootballKey,
            'X-RapidAPI-Host': 'api-football-v1.p.rapidapi.com'
          };

      // Get live fixtures
      const response = await axios.get(`${this.baseUrl}/fixtures`, {
        headers,
        params: {
          live: 'all',  // Get all live fixtures
          timezone: 'Africa/Addis_Ababa'
        },
        timeout: 10000,
        httpsAgent: new (require('https').Agent)({
          keepAlive: true,
          rejectUnauthorized: true
        })
      });

      const fixtures = response.data.response || [];
      console.log(`🔴 Found ${fixtures.length} live matches`);

      if (fixtures.length === 0) {
        console.log('⚽ No live matches currently');
        return [];
      }

      // Process live matches
      const liveMatches = fixtures.map(fixture => ({
        homeTeam: fixture.teams.home.name,
        awayTeam: fixture.teams.away.name,
        homeScore: fixture.goals.home || 0,
        awayScore: fixture.goals.away || 0,
        status: fixture.fixture.status.short === '1H' || fixture.fixture.status.short === '2H' ? 'LIVE' : fixture.fixture.status.long,
        minute: fixture.fixture.status.elapsed || 0,
        competition: fixture.league.name,
        leagueId: fixture.league.id,
        fixtureId: fixture.fixture.id,
        date: fixture.fixture.date
      }));

      // Sort by league importance and minute
      const sortedMatches = liveMatches.sort((a, b) => {
        const leaguePriority = { 'Premier League': 5, 'La Liga': 4, 'Serie A': 3, 'Bundesliga': 2, 'Ligue 1': 1 };
        const aPriority = leaguePriority[a.competition] || 0;
        const bPriority = leaguePriority[b.competition] || 0;
        return bPriority - aPriority;
      });

      return sortedMatches.slice(0, 10); // Return max 10 live matches

    } catch (error) {
      console.error('❌ Error fetching live matches:', error.message);
      
      // Return fallback live matches for testing
      return this.getFallbackLiveMatches();
    }
  }

  // Get recent finished matches (last 2-3 hours)
  async getRecentResults() {
    console.log('⚡ Fetching recent finished matches...');
    
    try {
      const headers = this.isDirect 
        ? { 'x-apisports-key': this.apiFootballKey }
        : { 
            'X-RapidAPI-Key': this.apiFootballKey,
            'X-RapidAPI-Host': 'api-football-v1.p.rapidapi.com'
          };

      // Get today's fixtures to find recently finished ones
      const today = new Date().toISOString().split('T')[0];
      
      const response = await axios.get(`${this.baseUrl}/fixtures`, {
        headers,
        params: {
          date: today,
          timezone: 'Africa/Addis_Ababa',
          status: 'FT'  // Full time finished matches
        },
        timeout: 10000,
        httpsAgent: new (require('https').Agent)({
          keepAlive: true,
          rejectUnauthorized: true
        })
      });

      const fixtures = response.data.response || [];
      console.log(`⚡ Found ${fixtures.length} finished matches today`);

      if (fixtures.length === 0) {
        return this.getFallbackRecentResults();
      }

      // Filter for recently finished matches (last 3 hours)
      const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
      
      const recentResults = fixtures
        .filter(fixture => {
          const finishTime = new Date(fixture.fixture.date);
          // Add 90 minutes to start time to estimate finish time
          finishTime.setMinutes(finishTime.getMinutes() + 90);
          return finishTime >= threeHoursAgo;
        })
        .map(fixture => ({
          homeTeam: fixture.teams.home.name,
          awayTeam: fixture.teams.away.name,
          homeScore: fixture.goals.home || 0,
          awayScore: fixture.goals.away || 0,
          competition: fixture.league.name,
          fixtureId: fixture.fixture.id,
          finishTime: fixture.fixture.date
        }))
        .slice(0, 5); // Max 5 recent results

      console.log(`⚡ Found ${recentResults.length} recent results`);
      return recentResults;

    } catch (error) {
      console.error('❌ Error fetching recent results:', error.message);
      return this.getFallbackRecentResults();
    }
  }

  // Fallback recent results
  getFallbackRecentResults() {
    console.log('🔄 Using fallback recent results...');
    return [
      {
        homeTeam: 'Arsenal',
        awayTeam: 'Chelsea',
        homeScore: 2,
        awayScore: 1,
        competition: 'Premier League',
        fixtureId: 'fallback_recent_1'
      },
      {
        homeTeam: 'Juventus',
        awayTeam: 'AC Milan',
        homeScore: 1,
        awayScore: 3,
        competition: 'Serie A',
        fixtureId: 'fallback_recent_2'
      }
    ];
  }

  // Fallback live matches for testing
  getFallbackLiveMatches() {
    console.log('🔄 Using fallback live matches...');
    return [
      {
        homeTeam: 'Manchester United',
        awayTeam: 'Liverpool',
        homeScore: 1,
        awayScore: 1,
        status: 'LIVE',
        minute: 67,
        competition: 'Premier League',
        fixtureId: 'fallback_1'
      },
      {
        homeTeam: 'Real Madrid',
        awayTeam: 'Barcelona',
        homeScore: 0,
        awayScore: 2,
        status: 'LIVE',
        minute: 43,
        competition: 'La Liga',
        fixtureId: 'fallback_2'
      }
    ];
  }

  // Fallback results for testing when API is unavailable
  getFallbackResults() {
    console.log('🔄 Using fallback test results...');
    return [
      {
        homeTeam: 'Chelsea',
        awayTeam: 'Arsenal',
        homeScore: 2,
        awayScore: 1,
        competition: 'Premier League'
      },
      {
        homeTeam: 'Atletico Madrid',
        awayTeam: 'Valencia',
        homeScore: 3,
        awayScore: 0,
        competition: 'La Liga'
      },
      {
        homeTeam: 'Inter Milan',
        awayTeam: 'Napoli',
        homeScore: 1,
        awayScore: 1,
        competition: 'Serie A'
      }
    ];
  }
}

module.exports = FootballAPI;