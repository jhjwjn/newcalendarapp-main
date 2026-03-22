import React, { useState } from 'react';
import { useHealth } from '../../../context/HealthContext';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { X, Plus, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from '../../../lib/toast';

type MetricTab = '체중' | '골격근량' | '체지방량' | '체지방률' | 'BMI';

interface BodyTabProps {
  theme: any;
}

export function BodyTab({ theme }: BodyTabProps) {
  const { bodyRecords, getLatestBodyRecord, addBodyRecord } = useHealth();
  const [selectedTab, setSelectedTab] = useState<MetricTab>('체중');
  const [showAddSheet, setShowAddSheet] = useState(false);

  const latestRecord = getLatestBodyRecord();
  
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    weight: latestRecord?.weight || 0,
    muscleMass: latestRecord?.muscleMass || 0,
    bodyFat: latestRecord?.bodyFat || 0,
    bodyFatMass: latestRecord?.bodyFatMass || 0,
    bmi: latestRecord?.bmi || 0,
    visceralFat: latestRecord?.visceralFat,
  });

  const metrics = [
    { label: '체중', value: latestRecord?.weight, unit: 'kg' },
    { label: '골격근량', value: latestRecord?.muscleMass, unit: 'kg' },
    { label: '체지방률', value: latestRecord?.bodyFat, unit: '%' },
    { label: '체지방량', value: latestRecord?.bodyFatMass, unit: 'kg' },
    { label: 'BMI', value: latestRecord?.bmi, unit: '' },
    { label: '내장지방', value: latestRecord?.visceralFat, unit: '레벨' },
  ];

  const tabs: MetricTab[] = ['체중', '골격근량', '체지방량', '체지방률', 'BMI'];

  const handleSave = async () => {
    await addBodyRecord({
      date: formData.date,
      weight: formData.weight,
      muscleMass: formData.muscleMass,
      bodyFat: formData.bodyFat,
      bodyFatMass: formData.bodyFatMass,
      bmi: formData.bmi,
      visceralFat: formData.visceralFat,
    });

    setShowAddSheet(false);
    toast.success('인바디 기록이 저장되었습니다.');
  };

  const getChartData = () => {
    const sorted = [...bodyRecords].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    let key: keyof typeof formData;
    switch (selectedTab) {
      case '체중': key = 'weight'; break;
      case '골격근량': key = 'muscleMass'; break;
      case '체지방량': key = 'bodyFatMass'; break;
      case '체지방률': key = 'bodyFat'; break;
      case 'BMI': key = 'bmi'; break;
      default: key = 'weight';
    }

    return sorted.map(r => ({ date: r.date, value: r[key] || 0 }));
  };

  const chartData = getChartData();
  const hasEnoughData = chartData.length >= 2;

  return (
    <div className="min-h-full pb-24" style={{ backgroundColor: theme.bg }}>
      <div className="mx-auto max-w-[1320px] px-4 pb-6 pt-3">
        {/* 헤더 */}
        <div className="mb-4 md:mb-6">
          <h1 className="text-2xl md:text-4xl font-black tracking-tight mb-1 md:mb-2" style={{ color: theme.text }}>
            BODY
          </h1>
          <p className="text-sm md:text-base font-medium" style={{ color: theme.textSecondary }}>
            {latestRecord ? format(new Date(latestRecord.date), 'M월 d일 측정', { locale: ko }) : '기록 없음'}
          </p>
        </div>

        {/* 현재 지표 - 모바일 3열 2줄 / 데스크탑 3열 */}
        <div className="grid grid-cols-3 gap-2 md:gap-3 mb-4 md:mb-6">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="rounded-xl md:rounded-2xl p-3 md:p-4 shadow-md md:shadow-xl border"
              style={{ background: theme.panelBackgroundStrong || theme.card, borderColor: theme.cardBorder, boxShadow: theme.elevatedShadow }}
            >
              <div className="text-[10px] md:text-xs font-bold mb-1 md:mb-2" style={{ color: theme.textSecondary }}>
                {metric.label}
              </div>
              <div className="flex items-baseline gap-1 md:gap-2">
                <span className="text-xl md:text-3xl font-black" style={{ color: theme.text }}>
                  {metric.value?.toFixed(1) || '-'}
                </span>
                {metric.unit && (
                  <span className="text-[10px] md:text-sm font-semibold" style={{ color: theme.textMuted }}>
                    {metric.unit}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* 추이 그래프 */}
        <div
          className="rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-lg md:shadow-xl border mb-4 md:mb-6"
          style={{ background: theme.panelBackgroundStrong || theme.card, borderColor: theme.cardBorder, boxShadow: theme.panelShadow }}
        >
          <div className="flex items-center gap-2 mb-3 md:mb-5">
            <TrendingUp className="w-4 h-4 md:w-5 md:h-5" style={{ color: theme.primary }} />
            <h3 className="text-sm md:text-lg font-black" style={{ color: theme.text }}>
              측정 추이
            </h3>
          </div>

          {/* 탭 */}
          <div className="flex gap-1.5 md:gap-2 mb-4 md:mb-6 overflow-x-auto pb-1">
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setSelectedTab(tab)}
                className="px-3 md:px-5 py-2 md:py-2.5 rounded-lg md:rounded-xl font-bold text-xs md:text-sm whitespace-nowrap transition-all"
                style={{
                  background: selectedTab === tab ? theme.buttonGradient || theme.primary : theme.accentSurface || theme.accent,
                  color: selectedTab === tab ? theme.bg : theme.textMuted,
                  boxShadow: selectedTab === tab ? theme.buttonShadow : 'none',
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {hasEnoughData ? (
            <div className="h-48 md:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.cardBorder} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => format(new Date(value), 'M/d')}
                    stroke={theme.textMuted}
                    style={{ fontSize: '10px' }}
                  />
                  <YAxis stroke={theme.textMuted} style={{ fontSize: '10px' }} />
                  <Tooltip
                    contentStyle={{
                      background: theme.panelBackgroundStrong || theme.card,
                      border: `1px solid ${theme.cardBorder}`,
                      borderRadius: '8px',
                      color: theme.text,
                      fontWeight: 700,
                      fontSize: '12px',
                    }}
                    labelStyle={{ color: theme.textSecondary, fontWeight: 600 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={theme.primary}
                    strokeWidth={2}
                    dot={{ fill: theme.primary, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-48 md:h-64 flex items-center justify-center">
              <div className="text-center">
                <div className="text-4xl md:text-5xl mb-2 md:mb-3">📊</div>
                <p className="text-sm md:text-lg font-bold mb-1" style={{ color: theme.text }}>
                  데이터가 부족해요
                </p>
                <p className="text-xs md:text-sm font-semibold" style={{ color: theme.textMuted }}>
                  2개 이상의 기록이 필요합니다
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 기록 추가 버튼 */}
        <button
          onClick={() => setShowAddSheet(true)}
          className="mb-4 md:mb-6 w-full py-3 md:py-4 rounded-2xl md:rounded-3xl font-bold md:font-black text-sm md:text-base shadow-lg md:shadow-xl flex items-center justify-center gap-2 md:gap-3"
          style={{
            background: theme.buttonGradient || theme.primary,
            color: theme.bg,
            boxShadow: theme.buttonShadow,
          }}
        >
          <Plus className="w-4 h-4 md:w-6 md:h-6" />
          인바디 기록 추가
        </button>

        {/* 기록 히스토리 */}
        {bodyRecords.length > 0 && (
          <div className="space-y-2 md:space-y-3">
            <h3 className="text-sm md:text-lg font-black px-1" style={{ color: theme.text }}>
              기록 히스토리
            </h3>
            {[...bodyRecords]
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map(record => (
                <div
                  key={record.id}
                  className="rounded-xl md:rounded-2xl p-3 md:p-5 shadow-md md:shadow-lg border"
                  style={{ background: theme.panelBackgroundStrong || theme.card, borderColor: theme.cardBorder, boxShadow: theme.panelShadow }}
                >
                  <div className="flex items-center justify-between mb-2 md:mb-3">
                    <span className="text-xs md:text-sm font-bold" style={{ color: theme.textSecondary }}>
                      {format(new Date(record.date), 'yyyy년 M월 d일', { locale: ko })}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 md:gap-3 text-xs md:text-sm">
                    <div>
                      <div className="font-semibold mb-0.5 md:mb-1" style={{ color: theme.textMuted }}>체중</div>
                      <div className="font-black" style={{ color: theme.text }}>{record.weight}kg</div>
                    </div>
                    <div>
                      <div className="font-semibold mb-0.5 md:mb-1" style={{ color: theme.textMuted }}>골격근량</div>
                      <div className="font-black" style={{ color: theme.text }}>{record.muscleMass}kg</div>
                    </div>
                    <div>
                      <div className="font-semibold mb-0.5 md:mb-1" style={{ color: theme.textMuted }}>체지방률</div>
                      <div className="font-black" style={{ color: theme.text }}>{record.bodyFat}%</div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* 기록 추가 모달 */}
      <AnimatePresence>
        {showAddSheet && (
          <>
            <motion.div
              className="fixed inset-0 z-50"
              style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setShowAddSheet(false)}
            />
            <motion.div
              className="fixed inset-x-0 bottom-0 md:inset-0 md:flex md:items-center md:justify-center z-50"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              onClick={() => setShowAddSheet(false)}
            >
              <motion.div
                className="rounded-t-2xl md:rounded-3xl p-4 md:p-6 max-h-[85vh] overflow-y-auto md:max-w-md md:w-full shadow-xl md:shadow-2xl"
                style={{ background: theme.panelBackgroundStrong || theme.card, boxShadow: theme.elevatedShadow }}
                onClick={(e) => e.stopPropagation()}
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="flex items-center justify-between mb-4 md:mb-6">
                  <h3 className="text-lg md:text-2xl font-black" style={{ color: theme.text }}>
                    인바디 기록 추가
                  </h3>
                  <button onClick={() => setShowAddSheet(false)}>
                    <X className="w-5 h-5 md:w-7 md:h-7" style={{ color: theme.textMuted }} />
                  </button>
                </div>

                <div className="space-y-3 md:space-y-4">
                  <div>
                    <label className="block text-xs md:text-sm font-bold mb-1.5 md:mb-2" style={{ color: theme.textSecondary }}>
                      측정 날짜
                    </label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full px-3 md:px-4 py-2.5 md:py-3 rounded-lg md:rounded-xl border-0 font-semibold text-sm"
                      style={{ background: theme.accentSurface || theme.accent, color: theme.text }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-bold mb-1.5 md:mb-2" style={{ color: theme.textSecondary }}>
                      체중 (kg)
                    </label>
                    <input type="number" step="0.1" value={formData.weight || ''} onChange={(e) => setFormData({ ...formData, weight: Number(e.target.value) })} className="w-full px-3 md:px-4 py-2.5 md:py-3 rounded-lg md:rounded-xl border-0 font-semibold text-sm" style={{ background: theme.accentSurface || theme.accent, color: theme.text }} placeholder="0.0" />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-bold mb-1.5 md:mb-2" style={{ color: theme.textSecondary }}>
                      골격근량 (kg)
                    </label>
                    <input type="number" step="0.1" value={formData.muscleMass || ''} onChange={(e) => setFormData({ ...formData, muscleMass: Number(e.target.value) })} className="w-full px-3 md:px-4 py-2.5 md:py-3 rounded-lg md:rounded-xl border-0 font-semibold text-sm" style={{ background: theme.accentSurface || theme.accent, color: theme.text }} placeholder="0.0" />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-bold mb-1.5 md:mb-2" style={{ color: theme.textSecondary }}>
                      체지방률 (%)
                    </label>
                    <input type="number" step="0.1" value={formData.bodyFat || ''} onChange={(e) => setFormData({ ...formData, bodyFat: Number(e.target.value) })} className="w-full px-3 md:px-4 py-2.5 md:py-3 rounded-lg md:rounded-xl border-0 font-semibold text-sm" style={{ background: theme.accentSurface || theme.accent, color: theme.text }} placeholder="0.0" />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-bold mb-1.5 md:mb-2" style={{ color: theme.textSecondary }}>
                      체지방량 (kg)
                    </label>
                    <input type="number" step="0.1" value={formData.bodyFatMass || ''} onChange={(e) => setFormData({ ...formData, bodyFatMass: Number(e.target.value) })} className="w-full px-3 md:px-4 py-2.5 md:py-3 rounded-lg md:rounded-xl border-0 font-semibold text-sm" style={{ background: theme.accentSurface || theme.accent, color: theme.text }} placeholder="0.0" />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-bold mb-1.5 md:mb-2" style={{ color: theme.textSecondary }}>
                      BMI
                    </label>
                    <input type="number" step="0.1" value={formData.bmi || ''} onChange={(e) => setFormData({ ...formData, bmi: Number(e.target.value) })} className="w-full px-3 md:px-4 py-2.5 md:py-3 rounded-lg md:rounded-xl border-0 font-semibold text-sm" style={{ background: theme.accentSurface || theme.accent, color: theme.text }} placeholder="0.0" />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-bold mb-1.5 md:mb-2" style={{ color: theme.textSecondary }}>
                      내장지방 (레벨, 선택)
                    </label>
                    <input type="number" value={formData.visceralFat || ''} onChange={(e) => setFormData({ ...formData, visceralFat: Number(e.target.value) || undefined })} className="w-full px-3 md:px-4 py-2.5 md:py-3 rounded-lg md:rounded-xl border-0 font-semibold text-sm" style={{ background: theme.accentSurface || theme.accent, color: theme.text }} placeholder="0" />
                  </div>
                  <button
                    onClick={handleSave}
                    className="w-full py-3 md:py-4 rounded-xl md:rounded-2xl font-bold md:font-black text-sm md:text-lg shadow-xl mt-4 md:mt-6"
                    style={{ background: theme.buttonGradient || theme.primary, color: theme.bg, boxShadow: theme.buttonShadow }}
                  >
                    저장하기
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
