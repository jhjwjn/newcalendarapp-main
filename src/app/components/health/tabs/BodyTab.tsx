import React, { useState, useMemo } from 'react';
import { useHealth } from '../../../context/HealthContext';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Plus, Trash2, TrendingUp, TrendingDown, Scale, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { toast } from '../../../lib/toast';

interface BodyTabProps {
  theme: any;
}

export function BodyTab({ theme }: BodyTabProps) {
  const { bodyRecords, addBodyRecord, deleteBodyRecord, getLatestBodyRecord, settings } = useHealth();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    weight: '',
    muscleMass: '',
    bodyFat: '',
    bodyFatMass: '',
    visceralFat: '',
    date: format(new Date(), 'yyyy-MM-dd'),
  });

  const latest = getLatestBodyRecord();

  const calculateBMI = (weight: number) => {
    if (!settings.height || settings.height === 0) return null;
    const heightM = settings.height / 100;
    return weight / (heightM * heightM);
  };

  const sortedRecords = useMemo(
    () => [...bodyRecords].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [bodyRecords]
  );

  const chartData = useMemo(() => {
    return sortedRecords.slice(-30).map(r => ({
      date: format(new Date(r.date), 'M/d'),
      weight: r.weight,
      bodyFat: r.bodyFat,
      muscle: r.muscleMass,
      bmi: r.bmi ? parseFloat(r.bmi.toFixed(1)) : undefined,
    }));
  }, [sortedRecords]);

  const handleSave = async () => {
    if (!form.weight) {
      toast.error('체중을 입력해주세요');
      return;
    }
    const weight = parseFloat(form.weight);
    const bmi = calculateBMI(weight);

    await addBodyRecord({
      date: form.date,
      weight,
      muscleMass: form.muscleMass ? parseFloat(form.muscleMass) : undefined,
      bodyFat: form.bodyFat ? parseFloat(form.bodyFat) : undefined,
      bodyFatMass: form.bodyFatMass ? parseFloat(form.bodyFatMass) : undefined,
      bmi: bmi || undefined,
      visceralFat: form.visceralFat ? parseFloat(form.visceralFat) : undefined,
    });

    toast.success('체성분이 기록되었습니다');
    setShowForm(false);
    setForm({ weight: '', muscleMass: '', bodyFat: '', bodyFatMass: '', visceralFat: '', date: format(new Date(), 'yyyy-MM-dd') });
  };

  const prev = sortedRecords.length >= 2 ? sortedRecords[sortedRecords.length - 2] : null;
  const getDiff = (current?: number, previous?: number) => {
    if (current == null || previous == null) return null;
    return (current - previous).toFixed(1);
  };

  const weightDiff = latest && prev ? getDiff(latest.weight, prev.weight) : null;
  const muscleDiff = latest && prev ? getDiff(latest.muscleMass, prev.muscleMass) : null;
  const bodyFatDiff = latest && prev ? getDiff(latest.bodyFat, prev.bodyFat) : null;

  const inputStyle = {
    background: theme.navBackground,
    color: theme.text,
    borderColor: theme.line,
  };

  return (
    <div className="mx-auto max-w-[1360px] p-3 md:p-5 space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: theme.textMuted }}>
            Body Composition
          </p>
          <h1 className="text-2xl font-black" style={{ color: theme.text }}>바디</h1>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 rounded-2xl px-4 py-2.5 text-sm font-bold text-white"
          style={{
            background: `linear-gradient(135deg, ${theme.primary}, ${theme.accent1 || theme.primary})`,
            boxShadow: `0 8px 24px ${theme.primary}30`,
          }}
        >
          <Plus className="h-4 w-4" />
          기록
        </motion.button>
      </div>

      {/* 최신 수치 */}
      {latest ? (
        <div
          className="rounded-2xl border p-4 md:p-5"
          style={{
            background: `linear-gradient(135deg, ${theme.primary}12, transparent)`,
            borderColor: `${theme.primary}25`,
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold" style={{ color: theme.text }}>최근 기록</h2>
            <p className="text-xs" style={{ color: theme.textMuted }}>
              {format(new Date(latest.date), 'M월 d일', { locale: ko })}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: '체중', value: latest.weight, unit: 'kg', diff: weightDiff, upIsBad: true },
              { label: '골격근량', value: latest.muscleMass, unit: 'kg', diff: muscleDiff, upIsBad: false },
              { label: '체지방률', value: latest.bodyFat, unit: '%', diff: bodyFatDiff, upIsBad: true },
              { label: 'BMI', value: latest.bmi?.toFixed(1), unit: '', diff: null, upIsBad: true },
            ].map((item, idx) => (
              <div key={idx} className="rounded-xl p-3" style={{ background: theme.panelBackground }}>
                <p className="text-[10px] font-semibold mb-1" style={{ color: theme.textMuted }}>{item.label}</p>
                <div className="flex items-end gap-1">
                  <span className="text-xl font-black" style={{ color: theme.primary }}>
                    {item.value ?? '-'}
                  </span>
                  <span className="text-xs mb-0.5" style={{ color: theme.textMuted }}>{item.unit}</span>
                </div>
                {item.diff !== null && item.diff !== undefined && (
                  <div className="flex items-center gap-0.5 mt-1">
                    {parseFloat(item.diff) > 0 ? (
                      <TrendingUp className="h-3 w-3" style={{ color: item.upIsBad ? '#f87171' : '#4ade80' }} />
                    ) : parseFloat(item.diff) < 0 ? (
                      <TrendingDown className="h-3 w-3" style={{ color: item.upIsBad ? '#4ade80' : '#f87171' }} />
                    ) : null}
                    <span
                      className="text-[10px] font-bold"
                      style={{
                        color: parseFloat(item.diff) === 0
                          ? theme.textMuted
                          : parseFloat(item.diff) > 0
                          ? item.upIsBad ? '#f87171' : '#4ade80'
                          : item.upIsBad ? '#4ade80' : '#f87171',
                      }}
                    >
                      {parseFloat(item.diff) > 0 ? '+' : ''}{item.diff}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div
          className="rounded-2xl border p-8 text-center"
          style={{ background: theme.panelBackground, borderColor: theme.panelBorder }}
        >
          <Scale className="h-8 w-8 mx-auto mb-2 opacity-20" style={{ color: theme.textMuted }} />
          <p className="text-sm font-semibold mb-1" style={{ color: theme.text }}>체성분 기록이 없어요</p>
          <p className="text-xs mb-4" style={{ color: theme.textMuted }}>첫 번째 기록을 추가해보세요</p>
          <button
            onClick={() => setShowForm(true)}
            className="text-sm font-bold px-4 py-2 rounded-2xl"
            style={{ background: `${theme.primary}18`, color: theme.primary }}
          >
            기록 시작하기
          </button>
        </div>
      )}

      {/* 추이 그래프 4종 — 최근 기록 아래, 히스토리 위 */}
      {chartData.length >= 2 && (
        <div
          className="rounded-2xl border p-4"
          style={{ background: theme.panelBackground, borderColor: theme.panelBorder }}
        >
          <h2 className="text-sm font-bold mb-4" style={{ color: theme.text }}>추이 그래프</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { key: 'weight', label: '체중', unit: 'kg', color: theme.primary },
              { key: 'muscle', label: '골격근량', unit: 'kg', color: '#10b981' },
              { key: 'bodyFat', label: '체지방률', unit: '%', color: '#f59e0b' },
              { key: 'bmi', label: 'BMI', unit: '', color: '#8b5cf6' },
            ].map(chart => {
              const hasData = chartData.some(d => d[chart.key as keyof typeof d] != null);
              if (!hasData) return null;
              return (
                <div key={chart.key} className="rounded-xl p-3" style={{ background: theme.navBackground }}>
                  <p className="text-[10px] font-semibold mb-2 uppercase tracking-widest" style={{ color: theme.textMuted }}>
                    {chart.label}{chart.unit ? ` (${chart.unit})` : ''}
                  </p>
                  <ResponsiveContainer width="100%" height={80}>
                    <LineChart data={chartData} margin={{ top: 2, right: 2, left: -30, bottom: 0 }}>
                      <YAxis hide domain={['auto', 'auto']} />
                      <Tooltip
                        contentStyle={{
                          background: theme.shellBackground || theme.panelBackground,
                          border: `1px solid ${theme.line}`,
                          borderRadius: '8px',
                          color: theme.text,
                          fontSize: '11px',
                          padding: '4px 8px',
                        }}
                        formatter={(value: any) => [`${value}${chart.unit}`, chart.label]}
                        labelFormatter={() => ''}
                      />
                      <Line
                        type="monotone"
                        dataKey={chart.key}
                        stroke={chart.color}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 3, fill: chart.color }}
                        connectNulls
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 기록 목록 */}
      {bodyRecords.length > 0 && (
        <div
          className="rounded-2xl border p-4"
          style={{ background: theme.panelBackground, borderColor: theme.panelBorder }}
        >
          <h2 className="text-sm font-bold mb-3" style={{ color: theme.text }}>기록 히스토리</h2>
          <div className="space-y-2">
            {sortedRecords.slice(-10).reverse().map(record => (
              <div
                key={record.id}
                className="flex items-center justify-between rounded-xl p-3"
                style={{ background: theme.navBackground }}
              >
                <div>
                  <p className="text-sm font-semibold" style={{ color: theme.text }}>
                    {format(new Date(record.date), 'M월 d일', { locale: ko })}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: theme.textMuted }}>
                    {record.weight}kg
                    {record.bodyFat != null && ` · 체지방 ${record.bodyFat}%`}
                    {record.muscleMass != null && ` · 근육 ${record.muscleMass}kg`}
                  </p>
                </div>
                <button
                  onClick={() => { deleteBodyRecord(record.id); toast.success('기록이 삭제되었습니다'); }}
                  className="p-1.5 rounded-xl"
                  style={{ color: theme.textMuted }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 입력 모달 */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.4)' }}
            onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-md rounded-3xl border"
              style={{
                background: theme.shellBackground,
                borderColor: theme.shellBorder,
                backdropFilter: 'blur(20px)',
              }}
            >
              <div className="flex items-center justify-between p-5 pb-4">
                <h3 className="text-lg font-black" style={{ color: theme.text }}>체성분 입력</h3>
                <button onClick={() => setShowForm(false)}>
                  <X className="h-5 w-5" style={{ color: theme.textMuted }} />
                </button>
              </div>

              <div className="px-5 pb-2 space-y-3">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-widest mb-1.5 block" style={{ color: theme.textMuted }}>날짜</label>
                  <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} className="w-full rounded-2xl border px-4 py-3 text-sm outline-none" style={inputStyle} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'weight', label: '체중 (kg) *', placeholder: '70.0', full: true },
                    { key: 'muscleMass', label: '골격근량 (kg)', placeholder: '35.0', full: false },
                    { key: 'bodyFat', label: '체지방률 (%)', placeholder: '20.0', full: false },
                    { key: 'bodyFatMass', label: '체지방량 (kg)', placeholder: '14.0', full: false },
                    { key: 'visceralFat', label: '내장지방', placeholder: '10', full: false },
                  ].map(field => (
                    <div key={field.key} className={field.full ? 'col-span-2' : ''}>
                      <label className="text-xs font-semibold mb-1.5 block" style={{ color: theme.textMuted }}>{field.label}</label>
                      <input
                        type="number"
                        step="0.1"
                        value={form[field.key as keyof typeof form]}
                        onChange={e => setForm(p => ({ ...p, [field.key]: e.target.value }))}
                        placeholder={field.placeholder}
                        className="w-full rounded-2xl border px-4 py-2.5 text-sm outline-none"
                        style={inputStyle}
                      />
                    </div>
                  ))}
                </div>
                {form.weight && settings.height > 0 && (
                  <div className="rounded-2xl p-3 text-center text-sm font-bold" style={{ background: `${theme.primary}10`, color: theme.primary }}>
                    BMI: {(parseFloat(form.weight) / Math.pow(settings.height / 100, 2)).toFixed(1)}
                  </div>
                )}
              </div>

              <div className="flex gap-3 p-5 pt-3">
                <button onClick={() => setShowForm(false)} className="flex-1 rounded-2xl py-3 text-sm font-bold border" style={{ borderColor: theme.line, color: theme.textMuted }}>취소</button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleSave}
                  className="flex-1 flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-white"
                  style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.accent1 || theme.primary})`, boxShadow: `0 8px 24px ${theme.primary}30` }}
                >
                  <Check className="h-4 w-4" />
                  저장
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
