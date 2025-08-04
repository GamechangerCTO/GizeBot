// Football API Integration for GizeBets
// Fetches match data from multiple sources

const axios = require('axios');

class FootballAPI {
  constructor() {
    this.footballApiKey = process.env.FOOTBALL_API_KEY;
    this.rapidApiKey = process.env.RAPID_API_KEY;
  }

  // Get today's important matches from top leagues
  async getTodayMatches() {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Premier League, La Liga, Serie A, Bundesliga, Ligue 1, Champions League
      const topLeagues = ['PL', 'PD', 'SA', 'BL1', 'FL1', 'CL'];
      
      const matches = [];
      
      for (const league of topLeagues) {
        try {
          const response = await axios.get(`https://api.football-data.org/v4/competitions/${league}/matches`, {
            headers: {
              'X-Auth-Token': this.footballApiKey
            },
            params: {
              dateFrom: today,
              dateTo: today
            }
          });
          
          if (response.data.matches) {
            matches.push(...response.data.matches);
          }
        } catch (error) {
          console.log(`Error fetching ${league}:`, error.message);
        }
      }
      
      if (matches.length === 0) {
        throw new Error('No matches found for today. Check API connection and keys.');
      }
      
      return this.selectTop5Matches(matches);
    } catch (error) {
      console.error('Error fetching today matches:', error);
      throw error; // No fallback - must use real data
    }
  }

  // Get yesterday's results
  async getYesterdayResults() {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      const topLeagues = ['PL', 'PD', 'SA', 'BL1', 'FL1', 'CL'];
      const results = [];
      
      for (const league of topLeagues) {
        try {
          const response = await axios.get(`https://api.football-data.org/v4/competitions/${league}/matches`, {
            headers: {
              'X-Auth-Token': this.footballApiKey
            },
            params: {
              dateFrom: yesterdayStr,
              dateTo: yesterdayStr,
              status: 'FINISHED'
            }
          });
          
          if (response.data.matches) {
            results.push(...response.data.matches);
          }
        } catch (error) {
          console.log(`Error fetching ${league} results:`, error.message);
        }
      }
      
      if (results.length === 0) {
        throw new Error('No results found for yesterday. Check API connection and keys.');
      }
      
      return this.processResults(results);
    } catch (error) {
      console.error('Error fetching yesterday results:', error);
      throw error; // No fallback - must use real data
    }
  }

  // Smart selection of Top 5 matches based on multiple criteria
  selectTop5Matches(matches) {
    console.log(`🔍 Analyzing ${matches.length} matches for Top 5 selection...`);
    
    // Score each match based on multiple criteria
    const scoredMatches = matches
      .filter(match => match.status === 'SCHEDULED' || match.status === 'TIMED')
      .map(match => ({
        ...match,
        score: this.calculateMatchScore(match)
      }))
      .sort((a, b) => b.score - a.score) // Sort by score descending
      .slice(0, 5); // Take top 5

    console.log('📊 Top 5 selected matches:');
    scoredMatches.forEach((match, index) => {
      console.log(`${index + 1}. ${match.homeTeam.name} vs ${match.awayTeam.name} (Score: ${match.score})`);
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
    
    score += leagueScores[match.competition.name] || 50;
    
    // Team reputation (based on common big teams)
    const bigTeams = [
      'Real Madrid', 'Barcelona', 'Manchester City', 'Manchester United',
      'Liverpool', 'Arsenal', 'Chelsea', 'Tottenham Hotspur',
      'Bayern Munich', 'Borussia Dortmund', 'Paris Saint-Germain',
      'Juventus', 'AC Milan', 'Inter Milan', 'Napoli',
      'Atletico Madrid', 'Arsenal', 'PSG'
    ];
    
    const homeTeamBig = bigTeams.some(team => match.homeTeam.name.includes(team));
    const awayTeamBig = bigTeams.some(team => match.awayTeam.name.includes(team));
    
    if (homeTeamBig) score += 25;
    if (awayTeamBig) score += 25;
    if (homeTeamBig && awayTeamBig) score += 30; // Derby bonus
    
    // Time preference (afternoon/evening matches get higher score)
    const matchHour = new Date(match.utcDate).getHours();
    if (matchHour >= 14 && matchHour <= 21) {
      score += 15; // Prime time bonus
    }
    
    // Stage importance (finals, semi-finals, etc.)
    if (match.stage && (
      match.stage.includes('FINAL') || 
      match.stage.includes('SEMI') ||
      match.stage.includes('QUARTER')
    )) {
      score += 40;
    }
    
    return score;
  }

  processMatches(matches) {
    return matches
      .filter(match => match.status === 'SCHEDULED' || match.status === 'TIMED')
      .map(match => ({
        id: match.id,
        homeTeam: {
          id: match.homeTeam.id,
          name: match.homeTeam.name,
          shortName: match.homeTeam.shortName,
          crest: match.homeTeam.crest
        },
        awayTeam: {
          id: match.awayTeam.id,
          name: match.awayTeam.name,
          shortName: match.awayTeam.shortName,
          crest: match.awayTeam.crest
        },
        competition: {
          id: match.competition.id,
          name: match.competition.name,
          code: match.competition.code,
          type: match.competition.type,
          emblem: match.competition.emblem
        },
        season: match.season,
        kickoffTime: new Date(match.utcDate),
        venue: match.venue || 'TBD',
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
      .filter(match => match.status === 'FINISHED')
      .map(match => ({
        homeTeam: match.homeTeam.name,
        awayTeam: match.awayTeam.name,
        homeScore: match.score.fullTime.home,
        awayScore: match.score.fullTime.away,
        competition: match.competition.name
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
      
      // Get team's recent matches for form analysis
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const today = new Date();
      
      const response = await axios.get(`https://api.football-data.org/v4/teams/${teamId}/matches`, {
        headers: {
          'X-Auth-Token': this.footballApiKey
        },
        params: {
          dateFrom: thirtyDaysAgo.toISOString().split('T')[0],
          dateTo: today.toISOString().split('T')[0],
          status: 'FINISHED'
        }
      });
      
      const recentMatches = response.data.matches || [];
      
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
      const isHome = match.homeTeam.name === teamName;
      const homeScore = match.score.fullTime.home;
      const awayScore = match.score.fullTime.away;
      
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
        const isHome = m.homeTeam.name === teamName;
        return isHome ? m.score.fullTime.away === 0 : m.score.fullTime.home === 0;
      }).length
    };
  }

  // Calculate team form (last 5 matches)
  calculateForm(matches, teamName) {
    const last5 = matches.slice(0, 5);
    const form = last5.map(match => {
      const isHome = match.homeTeam.name === teamName;
      const homeScore = match.score.fullTime.home;
      const awayScore = match.score.fullTime.away;
      
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
      
      // Get matches between these teams from last 2 years
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
      
      const response = await axios.get(`https://api.football-data.org/v4/teams/${homeTeamId}/matches`, {
        headers: {
          'X-Auth-Token': this.footballApiKey
        },
        params: {
          dateFrom: twoYearsAgo.toISOString().split('T')[0],
          status: 'FINISHED'
        }
      });
      
      // Filter matches against the specific opponent
      const h2hMatches = response.data.matches.filter(match => 
        match.homeTeam.id === awayTeamId || match.awayTeam.id === awayTeamId
      ).slice(0, 5); // Last 5 H2H matches
      
      return {
        totalMatches: h2hMatches.length,
        matches: h2hMatches,
        homeTeamWins: h2hMatches.filter(match => {
          const homeWin = match.homeTeam.id === homeTeamId && 
                         match.score.fullTime.home > match.score.fullTime.away;
          const awayWin = match.awayTeam.id === homeTeamId && 
                         match.score.fullTime.away > match.score.fullTime.home;
          return homeWin || awayWin;
        }).length,
        draws: h2hMatches.filter(match => 
          match.score.fullTime.home === match.score.fullTime.away
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
}

module.exports = FootballAPI;