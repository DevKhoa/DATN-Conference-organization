import React from 'react';
import { QrCode, Camera, Smartphone } from 'lucide-react';
import Button from '../../../ui/Button';

const QrCheckin = ({ data }) => {
    const liveStats = [
        { label: 'Total Checked In', value: '298 / 328', color: '#10b981' },
        { label: 'Last Check-in', value: 'Jane Doe (09:15 AM)', color: '#2563eb' },
        { label: 'Unpaid Issues', value: '3', color: '#ef4444' },
    ];

    return (
        <div>
            <h2 className="m-0 mb-2 text-[28px] font-semibold">QR Code Check-in 📱</h2>
            <p className="m-0 text-[#64748b] mb-6">On-site tool for quick QR scanning, attendance recording, and badge printing.</p>

            <div className="grid grid-cols-2 gap-6">
                <div className="p-6 bg-white rounded-xl border border-[#e2e8f0]">
                    <h3 className="m-0 mb-4 text-lg font-semibold">Check-in Console</h3>
                    <div className="h-50 bg-[#f8fafc] rounded-lg flex flex-col items-center justify-center mb-5 border-2 border-dashed border-[#e2e8f0]">
                        <Camera size={48} className="text-[#64748b]" />
                        <p className="text-[#64748b] mt-2">Simulated Camera View / Scan Area</p>
                    </div>
                    <input
                        type="text"
                        placeholder="Or Search Name/Email Manually..."
                        className="w-full p-2.5 border border-[#e2e8f0] rounded-md mb-4"
                    />
                    <Button icon={Smartphone} variant="primary">Launch Mobile Check-in App</Button>
                </div>

                <div className="p-6 bg-white rounded-xl border border-[#e2e8f0]">
                    <h3 className="m-0 mb-4 text-lg font-semibold">Live Check-in Stats</h3>
                    <div className="flex flex-col gap-3">
                        {liveStats.map((stat, idx) => (
                            <div
                                key={idx}
                                className="p-4 bg-[#f8fafc] rounded-lg flex justify-between"
                                style={{ borderLeft: `4px solid ${stat.color}` }}
                            >
                                <span className="text-[#64748b]">{stat.label}</span>
                                <span className="font-semibold" style={{ color: stat.color }}>{stat.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QrCheckin;