import React from 'react';
import { Calendar, Plus, Edit, AlertTriangle, Check } from 'lucide-react';
import Button from '../../../ui/Button';

const StaffAssignment = ({ data }) => {
    // Assuming data.staffAssignments is passed via props
    const staffAssignments = data?.staffAssignments || [
        { id: 'S1', session: 'AI & ML Session', time: '09:00-11:00', room: 'Hall A', chair: 'Dr. Smith', tech: 'John Doe', volunteers: 2, conflict: false },
        { id: 'S2', session: 'Blockchain Track', time: '11:30-13:30', room: 'Hall B', chair: 'Dr. Lee', tech: 'Jane Smith', volunteers: 2, conflict: false },
        { id: 'S3', session: 'Poster Session', time: '14:00-16:00', room: 'Lobby', chair: '', tech: '', volunteers: 0, conflict: true }
    ];

    return (
        <div>
            <h2 className="m-0 mb-2 text-[28px] font-semibold">Staff Assignment & Schedule 👥</h2>
            <p className="m-0 text-[#64748b] mb-6">Assign staff (Chairs, Tech, Volunteers) to sessions and manage schedules/conflicts.</p>

            <div className="flex gap-4 mb-6">
                <Button icon={Calendar}>View Full Schedule</Button>
                <Button icon={Plus} variant="secondary">Add Staff Member</Button>
            </div>

            <div className="bg-white border border-[#e2e8f0] rounded-xl overflow-hidden">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-[#f8fafc]">
                            {['Session', 'Time', 'Room', 'Chair', 'Tech', 'Volunteers', 'Conflicts', 'Actions'].map(header => (
                                <th key={header} className="p-4 text-left text-[13px] font-semibold text-[#64748b]">{header}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {staffAssignments.map((assignment, idx) => (
                            <tr key={assignment.id} className={idx < staffAssignments.length - 1 ? "border-b border-[#e2e8f0]" : ""}>
                                <td className="p-4 font-medium">{assignment.session}</td>
                                <td className="p-4 text-[#64748b]">{assignment.time}</td>
                                <td className="p-4">{assignment.room}</td>
                                <td className={`p-4 ${assignment.chair ? "text-[#1e293b]" : "text-[#ef4444]"}`}>
                                    {assignment.chair || 'UNASSIGNED'}
                                </td>
                                <td className={`p-4 ${assignment.tech ? "text-[#1e293b]" : "text-[#ef4444]"}`}>
                                    {assignment.tech || 'UNASSIGNED'}
                                </td>
                                <td className="p-4">{assignment.volunteers}</td>
                                <td className="p-4">
                                    {assignment.conflict ?
                                        <AlertTriangle size={18} className="text-[#ef4444]" /> :
                                        <Check size={18} className="text-[#10b981]" />
                                    }
                                </td>
                                <td className="p-4">
                                    <Button size="sm" icon={Edit} variant="secondary">Manage</Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default StaffAssignment;