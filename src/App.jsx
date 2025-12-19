import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, ChevronDown, MapPin, CheckCircle, XCircle, AlertCircle, Clock, Vote, RefreshCw, Power, Download, FileCode, WifiOff, ServerOff, Home, Info, BarChart2, Flag, Users, Layers, UserCheck, ThumbsUp, PieChart } from 'lucide-react';

// --- CONFIGURATION ---
const LOCAL_API_BASE_URL = "http://172.23.3.131:8000"; 
const NATIONAL_API_URL = "http://172.23.3.131:8000/parties";

// --- HELPERS ---
const getPartyColor = (name) => {
  const colorMap = {
    "ก้าวหน้า": "#F97316", "รวมใจ": "#EF4444", "ภูมิใจ": "#3B82F6", "พลังใหม่": "#22C55E",
    "รวมไทย": "#6366F1", "ประชา": "#0EA5E9", "ชาติ": "#EC4899", "เสรี": "#EAB308"
  };
  for (const key in colorMap) {
    if (name && name.includes(key)) return colorMap[key];
  }
  let hash = 0;
  if (name) {
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
  }
  const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
  return '#' + "00000".substring(0, 6 - c.length) + c;
};

// --- MOCK DATA FOR FALLBACK (Updated to match response_area.json structure) ---
const MOCK_AREAS = [
  {
    "id": "00a4c8c9-9cf3-4f11-87c2-154488a1e3b0",
    "name": "หนองบัวลำภู เขต 1",
    "areaNumber": 1,
    "provinceCode": "39",
    "provinceName": "หนองบัวลำภู",
    "totalVotes": 97320,
    "eligibleVoters": 138523,
    "invalidVotes": 1993,
    "noVotes": 994,
    "stationsReported": 212,
    "lastUpdated": "2025-12-19T09:56:15"
  },
  {
    "id": "01758dc0-11c9-44db-a3a8-ba739f9983ab",
    "name": "ราชบุรี เขต 1",
    "areaNumber": 1,
    "provinceCode": "70",
    "provinceName": "ราชบุรี",
    "totalVotes": 96026,
    "eligibleVoters": 138676,
    "invalidVotes": 1976,
    "noVotes": 984,
    "stationsReported": 212,
    "lastUpdated": "2025-12-19T09:56:44"
  },
  {
    "id": "26b4aad6-94b3-490a-9390-71636d5e97a4",
    "name": "กรุงเทพมหานคร เขต 1",
    "areaNumber": 1,
    "provinceCode": "10",
    "provinceName": "กรุงเทพมหานคร",
    "totalVotes": 115214,
    "eligibleVoters": 137554,
    "invalidVotes": 2244,
    "noVotes": 1113,
    "stationsReported": 232,
    "lastUpdated": "2025-12-19T09:55:58"
  },
  {
    "id": "a4b95b52-2371-4a3e-bc51-6b3381578720",
    "name": "กรุงเทพมหานคร เขต 2",
    "areaNumber": 2,
    "provinceCode": "10",
    "provinceName": "กรุงเทพมหานคร",
    "totalVotes": 89916,
    "eligibleVoters": 140733,
    "invalidVotes": 1844,
    "noVotes": 924,
    "stationsReported": 200,
    "lastUpdated": "2025-12-19T09:58:41"
  }
];

const MOCK_CANDIDATES = [
  // Mock candidates linked to MOCK_AREAS ids
  { id: 1, areaId: "26b4aad6-94b3-490a-9390-71636d5e97a4", candidateName: "นายสมชาย ใจดี", candidateNumber: 1, party: "พรรคก้าวหน้า", votes: 45000, percentage: 40.0, rank: 1 },
  { id: 2, areaId: "26b4aad6-94b3-490a-9390-71636d5e97a4", candidateName: "นางสาวสมหญิง รักไทย", candidateNumber: 5, party: "พรรครวมใจ", votes: 35000, percentage: 31.0, rank: 2 },
  { id: 3, areaId: "26b4aad6-94b3-490a-9390-71636d5e97a4", candidateName: "นายมั่นคง จริงใจ", candidateNumber: 3, party: "พรรคพัฒนา", votes: 20000, percentage: 17.0, rank: 3 },
  { id: 4, areaId: "00a4c8c9-9cf3-4f11-87c2-154488a1e3b0", candidateName: "นายอีสาน บ้านเฮา", candidateNumber: 10, party: "พรรคภูมิใจ", votes: 50000, percentage: 51.0, rank: 1 },
  { id: 5, areaId: "00a4c8c9-9cf3-4f11-87c2-154488a1e3b0", candidateName: "นายเมือง หลวง", candidateNumber: 3, party: "พรรครวมใจ", votes: 30000, percentage: 30.0, rank: 2 },
];

const MOCK_NATIONAL_RESULTS = [
  { id: 1, name: "พรรคก้าวหน้า", color: "#F97316", districtMps: 112, listMps: 39, totalMps: 151 },
  { id: 2, name: "พรรครวมใจ", color: "#EF4444", districtMps: 110, listMps: 31, totalMps: 141 },
  { id: 3, name: "พรรคภูมิใจ", color: "#3B82F6", districtMps: 68, listMps: 3, totalMps: 71 },
];

// --- MAIN COMPONENT ---
const App = () => {
  const [areas, setAreas] = useState([]); 
  const [candidates, setCandidates] = useState([]);
  const [nationalResults, setNationalResults] = useState([]);
  const [nationalLastUpdate, setNationalLastUpdate] = useState(null);
  const [currentPage, setCurrentPage] = useState('national'); 
  const [provinceSearch, setProvinceSearch] = useState('');
  const [selectedProvince, setSelectedProvince] = useState(null);
  const [selectedDistrictId, setSelectedDistrictId] = useState('');
  const [isProvinceDropdownOpen, setIsProvinceDropdownOpen] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  // File Handles
  const [nationalFileHandle, setNationalFileHandle] = useState(null);
  const [districtFileHandle, setDistrictFileHandle] = useState(null);

  // --- FETCHING ---
  const fetchNationalResults = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const response = await fetch(NATIONAL_API_URL, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) throw new Error('Failed');
      const apiData = await response.json();

      let rawData = [];
      if (Array.isArray(apiData)) {
        rawData = apiData;
        setNationalLastUpdate(new Date().toISOString());
      } else {
        rawData = apiData.data || apiData.parties || [];
        setNationalLastUpdate(apiData.last_updated || new Date().toISOString());
      }

      const mappedData = rawData.map((item, index) => ({
        id: index + 1,
        name: item.name,
        districtMps: parseInt(item.constituency_seats || 0),
        listMps: parseInt(item.paty_list_seats || item.party_list_seats || 0),
        totalMps: parseInt(item.total_seats || 0),
        color: item.color || getPartyColor(item.name)
      }));

      setNationalResults(mappedData);
      setConnectionStatus('connected');
    } catch (err) {
      if (nationalResults.length === 0) {
        setNationalResults(MOCK_NATIONAL_RESULTS);
        setNationalLastUpdate(new Date().toISOString());
        setConnectionStatus('offline');
      }
    }
  };

  const fetchAreas = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); 
      const response = await fetch(`${LOCAL_API_BASE_URL}/area`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!response.ok) throw new Error('Failed');
      const data = await response.json();
      setAreas(data);
      if (currentPage === 'district') setConnectionStatus('connected');
    } catch (err) {
      if (currentPage === 'district') setConnectionStatus('offline');
      if (areas.length === 0) setAreas(MOCK_AREAS); 
    }
  };

  const fetchAreaDetail = async (areaId) => {
    if (!areaId) return;
    setIsUpdating(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const response = await fetch(`${LOCAL_API_BASE_URL}/area/${areaId}`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!response.ok) throw new Error('Failed');
      const data = await response.json();
      
      let candidatesData = [];
      if (Array.isArray(data)) candidatesData = data;
      else if (data.candidates && Array.isArray(data.candidates)) candidatesData = data.candidates;
      else if (data.data && Array.isArray(data.data)) candidatesData = data.data;
      else if (data.results && Array.isArray(data.results)) candidatesData = data.results;
      
      setCandidates(candidatesData);

      // Update area info if provided in detail response
      const areaStats = data.area || (data.candidates ? data : null); 
      if (areaStats && !Array.isArray(areaStats)) {
         setAreas(prevAreas => 
           prevAreas.map(a => a.id === areaId ? { ...a, ...areaStats } : a)
         );
      }
      setConnectionStatus('connected');
    } catch (err) {
      setConnectionStatus('offline');
      const mockResult = MOCK_CANDIDATES.filter(c => (c.areaId || c.areaID) === areaId);
      setCandidates(mockResult);
    } finally {
      setIsUpdating(false);
    }
  };

  // --- EFFECTS ---
  useEffect(() => {
    fetchNationalResults();
    fetchAreas();
  }, []);

  useEffect(() => {
    if (selectedDistrictId) {
      setCandidates([]); 
      fetchAreaDetail(selectedDistrictId);
    } else {
      setCandidates([]);
    }
  }, [selectedDistrictId]);

  useEffect(() => {
    let interval;
    if (isAutoRefresh) {
      interval = setInterval(() => {
        if (currentPage === 'district') {
           if (selectedDistrictId) fetchAreaDetail(selectedDistrictId);
           fetchAreas(); 
        } else if (currentPage === 'national') {
           fetchNationalResults();
        }
      }, 10000); 
    }
    return () => clearInterval(interval);
  }, [isAutoRefresh, selectedDistrictId, currentPage]);

  // --- COMPUTED DATA ---
  const sortedNationalResults = useMemo(() => {
    return [...nationalResults].sort((a, b) => b.totalMps - a.totalMps);
  }, [nationalResults]);

  const nationalTotals = useMemo(() => {
    return sortedNationalResults.reduce((acc, curr) => ({
      district: acc.district + (curr.districtMps || 0),
      list: acc.list + (curr.listMps || 0),
      total: acc.total + (curr.totalMps || 0)
    }), { district: 0, list: 0, total: 0 });
  }, [sortedNationalResults]);

  const provinceData = useMemo(() => {
    const map = new Map();
    areas.forEach(area => {
      if (area && area.provinceName) {
        if (!map.has(area.provinceName)) {
          map.set(area.provinceName, { name: area.provinceName, count: 0, areas: [] });
        }
        const data = map.get(area.provinceName);
        data.count += 1;
        data.areas.push(area);
      }
    });
    // Sort areas by areaNumber if available, otherwise by name
    for (const province of map.values()) {
      province.areas.sort((a, b) => {
        if (a.areaNumber && b.areaNumber) {
          return a.areaNumber - b.areaNumber;
        }
        return a.name.localeCompare(b.name, 'th', { numeric: true });
      });
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'th'));
  }, [areas]);

  const filteredProvinces = useMemo(() => {
    return provinceData.filter(p => 
      p.name.includes(provinceSearch)
    );
  }, [provinceData, provinceSearch]);

  const currentAreaInfo = useMemo(() => {
    if (!selectedDistrictId) return null;
    return areas.find(a => a.id === selectedDistrictId);
  }, [selectedDistrictId, areas]);

  const currentCandidates = useMemo(() => {
    if (!selectedDistrictId || candidates.length === 0) return [];
    const getVotes = (c) => c.votes || c.vote || c.vote_count || c.score || 0;
    return [...candidates]
      .filter(c => c && (c.candidateName || c.candidate_name || c.name || c.fullname || c.candidate))
      .sort((a, b) => getVotes(b) - getVotes(a))
      .map((c, index) => {
        const votes = getVotes(c);
        let percentage = c.percentage || 0;
        // Use totalVotes from currentAreaInfo which now maps to API's totalVotes (voters turned out)
        if (!percentage && currentAreaInfo && currentAreaInfo.totalVotes > 0) {
           percentage = (votes / currentAreaInfo.totalVotes) * 100;
        }
        return {
          ...c,
          candidateName: c.candidateName || c.candidate_name || c.name || c.fullname || "ไม่ระบุชื่อ",
          party: c.party || c.party_name || "อิสระ",
          candidateNumber: c.candidateNumber || c.candidate_number || c.number || c.no || index + 1,
          votes: votes,
          percentage: percentage,
          rank: index + 1
        };
      });
  }, [candidates, selectedDistrictId, currentAreaInfo]);

  // --- HANDLERS ---
  const handleSelectProvince = (province) => {
    setSelectedProvince(province);
    setProvinceSearch(province.name);
    setIsProvinceDropdownOpen(false);
    setSelectedDistrictId('');
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col">
      {/* Header */}
      <header className="bg-blue-900 text-white shadow-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <Vote size={32} className="text-yellow-400" />
              <div>
                <h1 className="text-xl md:text-2xl font-bold">ระบบรายงานผลการเลือกตั้ง</h1>
                <p className="text-blue-200 text-xs md:text-sm">
                  {currentPage === 'national' ? 'National Overview' : 'District Level'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 bg-blue-800/50 p-2 rounded-lg backdrop-blur-sm">
              <div className="flex items-center gap-2 px-3 border-r border-blue-700/50">
                {connectionStatus === 'offline' ? (
                  <div className="flex items-center gap-1 text-red-300 animate-pulse">
                    <ServerOff size={14} /> <span className="text-xs font-semibold">Demo Mode</span>
                  </div>
                ) : connectionStatus === 'connected' ? (
                  <div className="flex items-center gap-1 text-green-300">
                     <div className={`w-2 h-2 rounded-full ${isUpdating ? 'bg-yellow-400 animate-ping' : 'bg-green-400'}`}></div>
                     <span className="text-xs hidden sm:inline">{isUpdating ? 'Updating...' : 'Online'}</span>
                  </div>
                ) : (
                  <span className="text-xs text-blue-300">Connecting...</span>
                )}
              </div>
              <button 
                onClick={() => setIsAutoRefresh(!isAutoRefresh)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  isAutoRefresh ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-slate-600 hover:bg-slate-700 text-slate-200'
                }`}
              >
                <Power size={14} />
                {isAutoRefresh ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>

          <nav className="flex gap-1 border-t border-blue-800/50 pt-1 overflow-x-auto">
            <button 
              onClick={() => setCurrentPage('national')}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-colors whitespace-nowrap ${
                currentPage === 'national' 
                  ? 'bg-slate-50 text-blue-900 border-t-2 border-yellow-400' 
                  : 'text-blue-200 hover:bg-blue-800 hover:text-white'
              }`}
            >
              <BarChart2 size={16} /> หน้าหลัก (ผลรวม)
            </button>
            <button 
              onClick={() => setCurrentPage('district')}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-colors whitespace-nowrap ${
                currentPage === 'district' 
                  ? 'bg-slate-50 text-blue-900 border-t-2 border-yellow-400' 
                  : 'text-blue-200 hover:bg-blue-800 hover:text-white'
              }`}
            >
              <MapPin size={16} /> แสดงผลรายเขต
            </button>
            <button 
              onClick={() => setCurrentPage('about')}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-colors whitespace-nowrap ${
                currentPage === 'about' 
                  ? 'bg-slate-50 text-blue-900 border-t-2 border-yellow-400' 
                  : 'text-blue-200 hover:bg-blue-800 hover:text-white'
              }`}
            >
              <Info size={16} /> เกี่ยวกับระบบ
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 md:p-6 w-full flex-1">
        {currentPage === 'national' && (
          <NationalResultsView 
            sortedNationalResults={sortedNationalResults} 
            nationalTotals={nationalTotals} 
            fileHandle={nationalFileHandle}
            setFileHandle={setNationalFileHandle}
            lastUpdated={nationalLastUpdate}
          />
        )}
        {currentPage === 'district' && (
          <DistrictResultsView 
            provinceSearch={provinceSearch}
            setProvinceSearch={setProvinceSearch}
            selectedProvince={selectedProvince}
            selectedDistrictId={selectedDistrictId}
            setSelectedDistrictId={setSelectedDistrictId}
            isProvinceDropdownOpen={isProvinceDropdownOpen}
            setIsProvinceDropdownOpen={setIsProvinceDropdownOpen}
            filteredProvinces={filteredProvinces}
            handleSelectProvince={handleSelectProvince}
            currentAreaInfo={currentAreaInfo}
            currentCandidates={currentCandidates}
            isUpdating={isUpdating}
            connectionStatus={connectionStatus}
            fileHandle={districtFileHandle}
            setFileHandle={setDistrictFileHandle}
          />
        )}
        {currentPage === 'about' && <AboutView />}
      </main>
    </div>
  );
};

// --- SUB-COMPONENTS ---

const NationalResultsView = ({ sortedNationalResults, nationalTotals, fileHandle, setFileHandle, lastUpdated }) => {
  const handleExportNationalXML = async () => {
    if (sortedNationalResults.length === 0) return;
    let xmlContent = `<?xml version="1.0" encoding="UTF-8"?>\n<NationalElectionResult>\n`;
    xmlContent += `  <Metadata><Timestamp>${new Date().toISOString()}</Timestamp></Metadata>\n  <Parties>\n`;
    sortedNationalResults.forEach((party, index) => {
        xmlContent += `    <Party><Rank>${index + 1}</Rank><Name>${party.name}</Name><DistrictMps>${party.districtMps}</DistrictMps><ListMps>${party.listMps}</ListMps><TotalMps>${party.totalMps}</TotalMps></Party>\n`;
    });
    xmlContent += `  </Parties>\n</NationalElectionResult>`;

    if ('showSaveFilePicker' in window) {
      try {
        let handle = fileHandle;
        if (!handle) {
          handle = await window.showSaveFilePicker({
            suggestedName: 'main.xml',
            types: [{ description: 'XML File', accept: { 'application/xml': ['.xml'] } }]
          });
          setFileHandle(handle);
        }
        const writable = await handle.createWritable();
        await writable.write(xmlContent);
        await writable.close();
        return;
      } catch (err) { if (err.name === 'AbortError') return; setFileHandle(null); }
    }
    const blob = new Blob([xmlContent], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'main.xml';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-blue-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
          <div className="flex flex-col">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <BarChart2 className="text-blue-600" /> สรุปผลการเลือกตั้ง (อย่างไม่เป็นทางการ)
            </h2>
            <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
              <Clock size={14} />
              <span>ข้อมูลล่าสุด: {lastUpdated ? new Date(lastUpdated).toLocaleTimeString('th-TH') : '-'}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleExportNationalXML}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 active:scale-95 border border-indigo-500 text-sm"
            >
              <FileCode size={16} />
              <span>EXPORT XML</span>
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-600 text-sm uppercase tracking-wider">
                <th className="p-4 w-16 text-center">อันดับ</th>
                <th className="p-4 w-16 text-center">พรรค</th>
                <th className="p-4">ชื่อพรรค</th>
                <th className="p-4 text-right">ส.ส. เขต</th>
                <th className="p-4 text-right">บัญชีรายชื่อ</th>
                <th className="p-4 text-right font-bold text-blue-900 bg-blue-50/50">รวม</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedNationalResults.map((party, index) => (
                <tr key={party.id || index} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 text-center font-bold text-slate-500">{index + 1}</td>
                  <td className="p-4 text-center">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm" style={{ backgroundColor: party.color || '#94A3B8' }}>{party.name.substring(0, 1)}</div>
                  </td>
                  <td className="p-4 font-semibold text-slate-800">{party.name}</td>
                  <td className="p-4 text-right text-slate-600 font-medium">{party.districtMps}</td>
                  <td className="p-4 text-right text-slate-600 font-medium">{party.listMps}</td>
                  <td className="p-4 text-right font-bold text-blue-700 bg-blue-50/30 text-lg">{party.totalMps}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-800 text-white font-bold">
              <tr>
                <td colSpan="3" className="p-4 text-right">รวมทั้งสิ้น</td>
                <td className="p-4 text-right">{nationalTotals.district}</td>
                <td className="p-4 text-right">{nationalTotals.list}</td>
                <td className="p-4 text-right bg-slate-900/30 text-lg text-yellow-400">{nationalTotals.total}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};

const DistrictResultsView = ({ 
  provinceSearch, setProvinceSearch, selectedProvince, selectedDistrictId, 
  setSelectedDistrictId, isProvinceDropdownOpen, setIsProvinceDropdownOpen, 
  filteredProvinces, handleSelectProvince, currentAreaInfo, 
  currentCandidates, isUpdating, connectionStatus, fileHandle, setFileHandle
}) => {
  
  // Calculate Good Votes (Sum of all candidate votes)
  const goodVotes = useMemo(() => {
    return currentCandidates.reduce((sum, candidate) => sum + (candidate.votes || 0), 0);
  }, [currentCandidates]);

  // Calculate Counting Progress % (Good + Invalid + NoVote) / Total Votes (Turnout)
  const countingProgress = useMemo(() => {
    if (!currentAreaInfo || !currentAreaInfo.totalVotes || currentAreaInfo.totalVotes === 0) return 0;
    const totalCounted = goodVotes + (currentAreaInfo.invalidVotes || 0) + (currentAreaInfo.noVotes || 0);
    const progress = (totalCounted / currentAreaInfo.totalVotes) * 100;
    return Math.min(progress, 100); // Cap at 100% just in case
  }, [currentAreaInfo, goodVotes]);

  const handleExportXML = async () => {
    if (!currentAreaInfo || currentCandidates.length === 0) return;
    let xmlContent = `<?xml version="1.0" encoding="UTF-8"?>\n<ElectionResult>\n`;
    xmlContent += `  <Metadata><Province>${currentAreaInfo.provinceName}</Province><District>${currentAreaInfo.name}</District></Metadata>\n`;
    xmlContent += `  <Candidates>${currentCandidates.map(c => `<Candidate><Name>${c.candidateName}</Name><Votes>${c.votes}</Votes></Candidate>`).join('')}</Candidates>\n`;
    xmlContent += `</ElectionResult>`;

    if ('showSaveFilePicker' in window) {
      try {
        let handle = fileHandle;
        if (!handle) {
          handle = await window.showSaveFilePicker({
            suggestedName: 'election.xml',
            types: [{ description: 'XML File', accept: { 'application/xml': ['.xml'] } }]
          });
          setFileHandle(handle);
        }
        const writable = await handle.createWritable();
        await writable.write(xmlContent);
        await writable.close();
        return;
      } catch (err) { if (err.name === 'AbortError') return; setFileHandle(null); }
    }
    const blob = new Blob([xmlContent], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'election.xml';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <MapPin className="text-blue-600" size={20} />
          ค้นหาพื้นที่แสดงผล
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <label className="block text-sm font-medium text-slate-600 mb-1">จังหวัด</label>
            <div className="relative">
              <input
                type="text"
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="พิมพ์ชื่อจังหวัด..."
                value={provinceSearch}
                onChange={(e) => {
                  setProvinceSearch(e.target.value);
                  setIsProvinceDropdownOpen(true);
                }}
                onFocus={() => setIsProvinceDropdownOpen(true)}
              />
              <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
              {isProvinceDropdownOpen && filteredProvinces.length > 0 && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                  {filteredProvinces.map((province, index) => (
                    <div
                      key={index}
                      className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-slate-700 flex justify-between items-center"
                      onClick={() => handleSelectProvince(province)}
                    >
                      <span>{province.name}</span>
                      <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                        {province.count} เขต
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">เขตเลือกตั้ง</label>
            <div className="relative">
              <select
                className="w-full pl-4 pr-10 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100 transition"
                value={selectedDistrictId}
                onChange={(e) => setSelectedDistrictId(e.target.value)}
                disabled={!selectedProvince}
              >
                <option value="">
                  {selectedProvince ? '-- กรุณาเลือกเขต --' : '-- กรุณาเลือกจังหวัดก่อน --'}
                </option>
                {selectedProvince?.areas.map((area) => (
                  <option key={area.id} value={area.id}>{area.name || `เขต ${area.areaNumber}`}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-2.5 text-slate-400 pointer-events-none" size={18} />
            </div>
          </div>
        </div>
      </section>

      {selectedDistrictId && currentAreaInfo ? (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-200 pb-4">
             <div>
               <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                 {selectedProvince?.name} - {currentAreaInfo.name}
               </h2>
               <div className="flex flex-wrap gap-4 mt-1">
                  <p className="text-slate-500 text-sm flex items-center gap-2">
                    <Clock size={14} /> 
                    ข้อมูลล่าสุด: {currentAreaInfo.lastUpdated ? new Date(currentAreaInfo.lastUpdated).toLocaleTimeString('th-TH') : '-'}
                    {isUpdating && <span className="text-xs text-blue-600 animate-pulse">(กำลังดึงข้อมูล...)</span>}
                  </p>
                  <div className="text-slate-500 text-sm flex items-center gap-2 bg-slate-100 px-2 py-0.5 rounded-md">
                    <PieChart size={14} className="text-blue-500"/>
                    <span className="font-medium">นับคะแนนแล้ว:</span>
                    <span className="text-blue-600 font-bold">{countingProgress.toFixed(2)}%</span>
                  </div>
               </div>
             </div>
             <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto text-right items-end md:items-center">
                <button 
                  onClick={handleExportXML}
                  className="flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 active:scale-95 border border-indigo-500"
                >
                  <FileCode size={20} />
                  <span>EXPORT XML</span>
                </button>
             </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
            <StatCard icon={<Users size={16} className="text-purple-500"/>} label="ผู้มีสิทธิ" value={currentAreaInfo.eligibleVoters} bgColor="bg-purple-50" borderColor="border-purple-100" />
            <StatCard icon={<UserCheck size={16} className="text-blue-500"/>} label="ผู้มาใช้สิทธิ" value={currentAreaInfo.totalVotes} bgColor="bg-blue-50" borderColor="border-blue-100" />
            <StatCard icon={<ThumbsUp size={16} className="text-green-500"/>} label="บัตรดี" value={goodVotes} bgColor="bg-green-50" borderColor="border-green-100" />
            <StatCard icon={<XCircle size={16} className="text-red-500"/>} label="บัตรเสีย" value={currentAreaInfo.invalidVotes} bgColor="bg-red-50" borderColor="border-red-100" />
            <StatCard icon={<AlertCircle size={16} className="text-orange-500"/>} label="โนโหวต" value={currentAreaInfo.noVotes} bgColor="bg-orange-50" borderColor="border-orange-100" />
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="divide-y divide-slate-100">
              {currentCandidates.map((candidate, index) => (
                <CandidateRow key={candidate.id || index} candidate={candidate} />
              ))}
            </div>
            {currentCandidates.length === 0 && (
              <div className="p-12 text-center text-slate-400">
                {isUpdating ? 'กำลังโหลดข้อมูล...' : 'ไม่พบข้อมูลผู้สมัครในเขตนี้'}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">
          <MapPin size={64} className="mb-4 text-slate-200" />
          <p className="text-lg font-medium text-slate-500">รอการเลือกพื้นที่...</p>
          <p className="text-sm">กรุณาเลือกจังหวัดและเขตเลือกตั้งเพื่อดูผลคะแนนรายคน</p>
        </div>
      )}
    </div>
  );
};

const AboutView = () => (
  <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 animate-fade-in-up">
    <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3">
      <Info size={28} className="text-blue-600" />
      เกี่ยวกับระบบรายงานผล
    </h2>
    <div className="space-y-4 text-slate-600">
      <p>ระบบรายงานผลการเลือกตั้ง (Real-time Election Result System)</p>
    </div>
  </div>
);

const StatCard = ({ icon, label, value, bgColor, borderColor, isValueText }) => (
  <div className={`${bgColor} p-3 md:p-4 rounded-xl border ${borderColor} flex flex-col justify-center`}>
    <div className="text-xs md:text-sm text-slate-600 mb-1 flex items-center gap-1.5 font-medium">
      {icon} {label}
    </div>
    <div className={`text-lg md:text-xl xl:text-2xl font-bold text-slate-800 ${isValueText ? 'text-base' : ''}`}>
      {isValueText ? value : (value ? value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") : '0')}
    </div>
  </div>
);

const CandidateRow = ({ candidate }) => {
  const isWinner = candidate.rank === 1;
  return (
    <div className={`p-4 sm:p-5 hover:bg-slate-50 transition-colors relative group ${isWinner ? 'bg-yellow-50/40' : ''}`}>
      <div className="flex items-center gap-3 sm:gap-5 relative z-10">
        <div className="flex flex-col items-center min-w-[3.5rem]">
          <span className={`text-xs font-bold mb-1 uppercase tracking-wider ${isWinner ? 'text-yellow-600' : 'text-slate-400'}`}>Rank</span>
          <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center font-black text-lg md:text-xl shadow-sm border-2 ${isWinner ? 'bg-yellow-400 border-yellow-300 text-white' : 'bg-white border-slate-200 text-slate-600'}`}>
            {candidate.rank}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
             <span className="bg-blue-900 text-white text-xs px-1.5 py-0.5 rounded font-bold min-w-[24px] text-center">{candidate.candidateNumber}</span>
             <h4 className="font-bold text-base md:text-lg text-slate-800 truncate">{candidate.candidateName}</h4>
             {isWinner && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full border border-yellow-200 hidden sm:inline-block">นำอยู่</span>}
          </div>
          <p className="text-slate-500 text-sm mb-2">{candidate.party}</p>
          <div className="w-full bg-slate-100 rounded-full h-2 md:h-3 overflow-hidden">
            <div className={`h-full rounded-full transition-width duration-1000 ease-out ${isWinner ? 'bg-blue-600' : 'bg-slate-400'}`} style={{ width: `${candidate.percentage}%` }}></div>
          </div>
        </div>
        <div className="text-right min-w-[5.5rem]">
          <div className="text-lg md:text-2xl font-bold text-slate-900 tabular-nums">{candidate.votes ? candidate.votes.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") : '0'}</div>
          <div className="text-xs md:text-sm font-medium text-slate-500 tabular-nums">{candidate.percentage ? candidate.percentage.toFixed(2) : '0.00'}%</div>
        </div>
      </div>
    </div>
  );
};

export default App;