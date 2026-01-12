import React, { useState } from 'react';
import { MapPin, Plus, Save, Download, Globe, Eye } from 'lucide-react';
import Button from '../../../ui/Button'; // Import Button UI

const VenueAndTravel = ({ data }) => {
    // Mock data for hotels and travel requests
    const hotelList = data?.hotelList || [
        { id: 1, name: 'Hotel A (Partner)', distance: '0.5 km', rooms: 50, status: 'Active' },
        { id: 2, name: 'Hotel B', distance: '1.2 km', rooms: 0, status: 'Closed' }
    ];

    const travelRequests = data?.travelRequests || [
        { id: 'T001', guest: 'Dr. John Smith (Keynote)', type: 'Airport Pickup', date: '2025-05-10', status: 'Confirmed' },
        { id: 'T002', guest: 'Jane Lee (VIP)', type: 'Room Reservation', date: '2025-05-11', status: 'Pending' }
    ];

    return (
        <div>
            <h2 className="text-[28px] m-0 mb-2 font-semibold">Venue & Travel Management 🗺️</h2>
            <p className="text-[#64748b] mb-6">
                Manage recommended hotels, room blocks, and VIP transfer/accommodation requests.
            </p>

            {/* --- Hotel Management Section --- */}
            <div className="bg-white border border-[#e2e8f0] rounded-xl p-6 mb-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="m-0 text-lg font-semibold">Hotel List & Room Blocks</h3>
                    <Button icon={Plus} size="sm">Add New Hotel</Button>
                </div>

                <div className="flex flex-col gap-2.5">
                    {hotelList.map(hotel => (
                        <div key={hotel.id} className="p-3 bg-[#f8fafc] rounded-lg flex justify-between items-center">
                            <div>
                                <strong className={hotel.status === 'Active' ? "text-[#2563eb]" : "text-[#64748b]"}>
                                    {hotel.name}
                                </strong>
                                <span className="text-xs text-[#64748b] ml-2.5">({hotel.distance})</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="text-[#64748b]">Rooms Remaining: {hotel.rooms}</span>
                                <Button icon={Globe} variant="secondary" size="sm">View Map</Button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* --- VIP Travel Requests Section --- */}
            <div className="bg-white border border-[#e2e8f0] rounded-xl overflow-hidden">
                 <div className="flex justify-between items-center p-4">
                    <h3 className="m-0 text-lg font-semibold">Travel & Transfer Requests (VIPs)</h3>
                    <Button icon={Download} variant="secondary" size="sm">Export Schedule</Button>
                </div>

                <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-[#f8fafc]">
                            {["Request ID", "Guest/Role", "Type", "Date", "Status", "Actions"].map(h => (
                                <th key={h} className="p-3 text-[#64748b] text-left text-[13px]">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {travelRequests.map((req, idx) => (
                            <tr key={req.id} className={idx < travelRequests.length - 1 ? "border-b border-[#e2e8f0]" : ""}>
                                <td className="p-3 font-semibold text-[#2563eb]">{req.id}</td>
                                <td className="p-3">{req.guest}</td>
                                <td className="p-3">{req.type}</td>
                                <td className="p-3">{req.date}</td>
                                <td className="p-3">
                                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                        req.status === 'Confirmed'
                                            ? "bg-[#10b981]/[0.15] text-[#10b981]"
                                            : "bg-[#f59e0b]/[0.15] text-[#f59e0b]"
                                    }`}>
                                        {req.status}
                                    </span>
                                </td>
                                <td className="p-3">
                                    <Button icon={Eye} size="sm" variant="secondary">View</Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default VenueAndTravel;