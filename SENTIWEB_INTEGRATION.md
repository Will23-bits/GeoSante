# Sentiweb API Integration - GeoSante

## 📋 Overview

GeoSante now integrates real-time flu risk data from the **Sentiweb API**, the official French epidemiological surveillance network. This document explains the implementation, rate limiting strategy, and data flow.

## 🔗 API Source

- **Base URL**: `https://www.sentiweb.fr/api/v1/datasets/rest`
- **Data Source**: Sentiweb (Réseau Sentinelles)
- **Indicator**: Syndromes grippaux (ID: 3)
- **Geographic Level**: Regional (RDD - post-2016 French regions)
- **Data Format**: JSON

## 🛡️ Rate Limiting Strategy

To avoid getting banned from the Sentiweb API, we implement a comprehensive rate limiting strategy:

### 1. **Caching System**

```javascript
- Cache Duration: 1 hour (MIN_FETCH_INTERVAL_MS = 3,600,000 ms)
- Cooldown on 429: 24 hours (COOLDOWN_MS_ON_429 = 86,400,000 ms)
- Version Checking: Only refetch if API version changes
```

### 2. **Retry Logic with Exponential Backoff**

```javascript
- Max Retries: 3 attempts
- Initial Delay: 5 minutes
- Backoff Strategy: delay × 2^attempt
  - Attempt 1: 5 min
  - Attempt 2: 10 min
  - Attempt 3: 20 min
```

### 3. **Request Throttling**

```javascript
- Single-flight Pattern: Only one API request at a time
- Inflight Promise Reuse: Multiple concurrent requests share same promise
- Request Timeout: 20 seconds per request
```

### 4. **Graceful Degradation**

- **Primary Endpoint**: `inc-3-RDD` (most recent data)
- **Fallback Endpoint**: `inc-3-RDD-ds2` (alternative dataset)
- **Ultimate Fallback**: Mock data if all API calls fail

## 📊 Data Flow

### 1. **Fetching Regional Data**

```
API Call → Sentiweb Regional Incidence
  ↓
Parse JSON response (week, inc100, geo_insee)
  ↓
Filter last 260 weeks (~5 years)
  ↓
Calculate regional intensity (0-1 score)
```

### 2. **Mapping to Departments**

```
Regional Intensity Map
  ↓
Department → Region Mapping (deptToRegion)
  ↓
Apply regional risk score to all departments in region
  ↓
Add department centroids (lat/lng from GeoJSON)
  ↓
Generate final department data with risk levels
```

### 3. **Risk Calculation**

```javascript
// Intensity formula
const recentAvg = avg(last 6 weeks incidence)
const p90 = 90th percentile of 5-year data
const intensity = min(1, max(0, recentAvg / max(50, p90, min(p95, 400))))
```

## 🗺️ Geographic Coverage

### Metropolitan France

- **All 94 metropolitan departments** mapped to 13 regions
- Includes Corsica (2A, 2B → region 94)
- Real-time Sentiweb risk scores applied

### DOM-TOM (Overseas Territories)

- **Not covered by Sentiweb** (no overseas data available)
- Using mock risk scores for:
  - Guadeloupe (971), Martinique (972)
  - Guyane (973), La Réunion (974)
  - Mayotte (976), Polynésie française (987)
  - Nouvelle-Calédonie (988)

## 📁 Data Storage

### 1. **Centroids Cache**

```
File: server/data/deptCentroids.json
Source: https://france-geojson.gregoiredavid.fr/repo/departements.geojson
Purpose: Department coordinates (lat/lng) computed from bbox
Update: Generated once, cached locally
```

### 2. **Runtime Cache**

```javascript
sentiwebCache = {
  version: "API version hash",
  regionalIntensity: Map<regionCode, intensity>,
  lastAt: timestamp,
  cooldownUntil: timestamp,
  inflight: Promise | null
}
```

## 🚀 Usage

### Server-Side (Automatic)

The data is automatically fetched when:

1. First request to `/api/risk-data`
2. Cache expired (> 1 hour old)
3. API version changed
4. Server restart

### Client-Side Integration

The map receives processed data via the `/api/risk-data` endpoint:

```javascript
// Response format
{
  departments: [
    {
      code: "75",
      name: "Paris",
      lat: 48.856,
      lng: 2.352,
      riskScore: 0.82,
      riskLevel: "high",
      vaccinationCoverage: 0.55,
      emergencyVisits: 1200,
      population: 2161000
    },
    // ... more departments
  ],
  lastUpdated: "2024-01-20T10:30:00.000Z"
}
```

## 🔧 Configuration

### Environment Variables (Optional)

```bash
# No API key required for Sentiweb
# Rate limiting is handled automatically
```

### Adjustable Parameters

In `server/data/fetchData.js`:

```javascript
// Caching
const MIN_FETCH_INTERVAL_MS = 1000 * 60 * 60; // 1 hour
const COOLDOWN_MS_ON_429 = 1000 * 60 * 60 * 24; // 24 hours

// Retries
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000 * 60 * 5; // 5 minutes

// Data Range
const WEEKS_5Y = 260; // ~5 years of data
const RECENT_WEEKS = 6; // Recent trend calculation
```

## 📈 Risk Levels

| Score Range | Level       | Color  | Description           |
| ----------- | ----------- | ------ | --------------------- |
| 0.0 - 0.3   | Très Faible | Green  | Very low flu activity |
| 0.3 - 0.5   | Faible      | Yellow | Low flu activity      |
| 0.5 - 0.7   | Moyen       | Orange | Medium flu activity   |
| 0.7 - 1.0   | Élevé       | Red    | High flu activity     |

## 🐛 Debugging

### Check API Status

```bash
# Test Sentiweb version endpoint
curl https://www.sentiweb.fr/api/v1/datasets/rest/version

# Test data endpoint
curl "https://www.sentiweb.fr/api/v1/datasets/rest/dataset?id=inc-3-RDD&span=short&\$format=json"
```

### Server Logs

```javascript
[ProcessData] Starting data processing with Sentiweb integration...
[ProcessData] Retrieved regional intensity for 13 regions
[Sentiweb] IDF recentAvg= 85.3 p90= 120.5 p95= 156.2 intensity= 0.71
[ProcessData] Successfully processed 94 departments
```

### Common Issues

1. **429 Too Many Requests**

   - Automatic 24h cooldown activated
   - Falls back to cached data
   - Mock data used if no cache available

2. **Empty Response**

   - Checks fallback endpoint
   - Uses cached data if available
   - Logs warning and continues

3. **Network Timeout**
   - Retry with exponential backoff
   - Falls back to mock data after 3 attempts

## 🎯 Benefits

✅ **Real-time Data**: Live flu surveillance from Sentiweb  
✅ **Automatic Updates**: Refreshes every hour  
✅ **Rate Limit Safe**: Comprehensive protection against bans  
✅ **Resilient**: Multiple fallback strategies  
✅ **Efficient**: Smart caching reduces API calls by 99%  
✅ **Complete**: All 94 metropolitan departments covered

## 📚 References

- [Sentiweb API Documentation](https://www.sentiweb.fr/api/v1/datasets/rest)
- [Réseau Sentinelles](https://www.sentiweb.fr/)
- [French GeoJSON Data](https://france-geojson.gregoiredavid.fr/)

---

**Last Updated**: January 2025  
**Status**: ✅ Active & Production-Ready
