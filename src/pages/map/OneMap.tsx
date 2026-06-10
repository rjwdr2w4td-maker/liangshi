import { useState } from 'react'
import { Wheat, ShieldAlert, ChevronRight, Activity, MapPin, TrendingUp, AlertTriangle, CloudLightning } from 'lucide-react'
import GrainProductionMap from './GrainProductionMap'
import DisasterCommandMap from './DisasterCommandMap'

type TabType = 'production' | 'disaster'

export default function OneMap() {
  const [activeTab, setActiveTab] = useState<TabType>('production')

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, #334155 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>

      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl"></div>

      <header className="relative z-10 px-8 py-5 flex items-center justify-between border-b border-slate-700/50 backdrop-blur-sm bg-slate-900/50">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-emerald-400 rounded-xl blur-lg opacity-50 animate-pulse"></div>
            <div className="relative bg-gradient-to-br from-cyan-400 to-emerald-400 p-2.5 rounded-xl">
              <MapPin className="w-6 h-6 text-slate-900" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent tracking-tight">
              智慧农业一张图
            </h1>
            <p className="text-sm text-slate-400 font-medium">Grain Production & Disaster Command Center</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 rounded-lg border border-slate-700/50">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-lg shadow-emerald-400/50"></span>
            <span className="text-xs text-slate-300 font-medium">系统在线</span>
          </div>
          <div className="text-xs text-slate-500 font-mono">
            {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })}
          </div>
        </div>
      </header>

      <nav className="relative z-10 px-8 py-4 flex gap-4 border-b border-slate-700/30">
        <button
          onClick={() => setActiveTab('production')}
          className={`group relative flex items-center gap-3 px-6 py-3.5 rounded-xl transition-all duration-300 ${
            activeTab === 'production'
              ? 'bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 border border-cyan-400/30'
              : 'bg-slate-800/30 border border-slate-700/30 hover:bg-slate-700/30 hover:border-slate-600/50'
          }`}
        >
          {activeTab === 'production' && (
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/10 to-emerald-400/10 rounded-xl animate-pulse"></div>
          )}
          <div className={`relative p-2 rounded-lg transition-colors ${
            activeTab === 'production' ? 'bg-cyan-400/20' : 'bg-slate-700/50 group-hover:bg-slate-600/50'
          }`}>
            <Wheat className={`w-5 h-5 transition-colors ${
              activeTab === 'production' ? 'text-cyan-300' : 'text-slate-400 group-hover:text-slate-300'
            }`} />
          </div>
          <div className="relative text-left">
            <div className={`text-sm font-semibold transition-colors ${
              activeTab === 'production' ? 'text-white' : 'text-slate-300 group-hover:text-white'
            }`}>
              粮食生产一张图
            </div>
            <div className="text-xs text-slate-500">播种收获进度监测</div>
          </div>
          {activeTab === 'production' && (
            <ChevronRight className="w-4 h-4 text-cyan-400 animate-pulse" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('disaster')}
          className={`group relative flex items-center gap-3 px-6 py-3.5 rounded-xl transition-all duration-300 ${
            activeTab === 'disaster'
              ? 'bg-gradient-to-r from-amber-500/20 to-rose-500/20 border border-amber-400/30'
              : 'bg-slate-800/30 border border-slate-700/30 hover:bg-slate-700/30 hover:border-slate-600/50'
          }`}
        >
          {activeTab === 'disaster' && (
            <div className="absolute inset-0 bg-gradient-to-r from-amber-400/10 to-rose-400/10 rounded-xl animate-pulse"></div>
          )}
          <div className={`relative p-2 rounded-lg transition-colors ${
            activeTab === 'disaster' ? 'bg-amber-400/20' : 'bg-slate-700/50 group-hover:bg-slate-600/50'
          }`}>
            <ShieldAlert className={`w-5 h-5 transition-colors ${
              activeTab === 'disaster' ? 'text-amber-300' : 'text-slate-400 group-hover:text-slate-300'
            }`} />
          </div>
          <div className="relative text-left">
            <div className={`text-sm font-semibold transition-colors ${
              activeTab === 'disaster' ? 'text-white' : 'text-slate-300 group-hover:text-white'
            }`}>
              防灾减灾指挥一张图
            </div>
            <div className="text-xs text-slate-500">气象预警与灾情响应</div>
          </div>
          {activeTab === 'disaster' && (
            <ChevronRight className="w-4 h-4 text-amber-400 animate-pulse" />
          )}
        </button>

        <div className="flex-1"></div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-slate-400">
            <Activity className="w-4 h-4" />
            <span className="text-xs">实时数据</span>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span className="text-xs">运行正常</span>
          </div>
        </div>
      </nav>

      <main className="relative z-10 flex-1 overflow-hidden">
        <div className={`absolute inset-0 transition-all duration-500 ${
          activeTab === 'production' ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-full pointer-events-none'
        }`}>
          <GrainProductionMap />
        </div>
        <div className={`absolute inset-0 transition-all duration-500 ${
          activeTab === 'disaster' ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full pointer-events-none'
        }`}>
          <DisasterCommandMap />
        </div>
      </main>
    </div>
  )
}
