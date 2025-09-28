import React from 'react';
import type { EventClickArg } from '@fullcalendar/core';
import Button from './Button';
import * as eventService from '../../services/eventService';

export interface EventDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    event: EventClickArg['event'] | null;
    onEdit: (event: EventClickArg['event']) => void;
    onDelete: (event: EventClickArg['event']) => void;
    // Notify parent to refresh after RSVP (optional)
    onAfterRSVP?: () => void;
}

const EventDetailModal: React.FC<EventDetailModalProps> = ({ isOpen, onClose, event, onEdit, onDelete, onAfterRSVP }) => {
    // local UI state for chip overflow toggles
    const [showAllEmployees, setShowAllEmployees] = React.useState(false);
    const [showAllPositions, setShowAllPositions] = React.useState(false);
    const [rsvpLoading, setRsvpLoading] = React.useState<'book' | 'reject' | null>(null);

    if (!isOpen || !event) return null;

    const { title, start, end, extendedProps } = event;

    // Replace explicit-only check with server-provided flag
    const isCompleted = String(extendedProps?.statusName || '').toLowerCase() === 'completed';
    const canShowRSVP = extendedProps?.canRSVP === true && !isCompleted;

    const actualEndDate = extendedProps.isMultiDay && extendedProps.originalEnd
        ? new Date(extendedProps.originalEnd)
        : end;

    const formatDateTime = (date: Date | null) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleString(undefined, {
            year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };
    // New RBAC: use server-provided flags for edit/delete rights. Require strict true.
    const canManage = event?.extendedProps?.canEdit === true;

    const myBooking = (event?.extendedProps as any)?.myBooking as ('Booked' | 'Rejected' | 'Attended' | 'Not Attended' | undefined);
    const spotsLeft = (event?.extendedProps as any)?.spotsLeft as number | undefined;
    const maxAtt = (event?.extendedProps as any)?.maxAttendees as number | undefined;
    const bookedCount = (event?.extendedProps as any)?.bookedCount as number | undefined;

    const canBookNow = () => {
        if (myBooking === 'Booked') return true; // can toggle to reject
        if (typeof spotsLeft === 'number') return spotsLeft > 0;
        return true; // unlimited
    };

    const doRSVP = async (choice: 'book' | 'reject') => {
        if (!event) return;
        setRsvpLoading(choice);
        try {
            await eventService.rsvpScheduledEvent(Number((event.extendedProps as any).scheduleId), choice);
            onAfterRSVP?.();
        } catch (e: any) {
            console.error('Failed to update RSVP:', e);
            alert(e?.message || 'Failed to update RSVP');
        } finally {
            setRsvpLoading(null);
        }
    };

    const DetailItem: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => {
        const isElement = React.isValidElement(value);

        const renderValue = () => {
            if (isElement) return <div className="inline-block">{value}</div>;
            if (value === null || value === undefined) return <span className="text-gray-400">N/A</span>;
            const text = String(value);
            const baseClasses = 'bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-sm px-2 py-1 rounded inline-block';
            const titleClasses = 'text-lg px-3 py-2';
            return (
                <span className={label === 'Title' ? `${baseClasses} ${titleClasses}` : baseClasses}>
                    {text}
                </span>
            );
        };

        const labelClass = label === 'Title'
            ? 'text-xs font-normal text-gray-500 dark:text-gray-400 tracking-wide'
            : 'text-xs font-semibold text-gray-500 dark:text-gray-400 tracking-wide';

        return (
            <div className="mb-4">
                <p className={labelClass}>{label}</p>
                <div className="mt-1 text-base text-gray-900 dark:text-gray-100 leading-snug">
                    {renderValue()}
                </div>
            </div>
        );
    };

    const getStatusBadge = (name: string | undefined | null) => {
        if (!name || String(name).trim() === '') {
            return <span className="text-gray-400">N/A</span>;
        }

        const status = String(name).toLowerCase().trim();
        let classes = 'inline-block px-2 py-1 rounded text-sm font-semibold ';
        switch (status) {
            case 'completed':
                classes += 'bg-green-800 text-white dark:bg-green-700';
                break;
            case 'cancelled':
            case 'canceled':
                classes += 'bg-red-600 text-white dark:bg-red-500';
                break;
            case 'scheduled':
                classes += 'bg-yellow-100 text-gray-800 dark:bg-yellow-900/30';
                break;
            case 'confirmed':
                classes += 'bg-green-100 text-green-800 dark:bg-green-900/30';
                break;
            default:
                classes += 'bg-gray-100 text-gray-800 dark:bg-gray-700';
        }
        return <span className={classes}>{name}</span>;
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-dark-div p-6 rounded-xl shadow-lg w-full max-w-2xl border border-gray-100 dark:border-gray-800">
                <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Event Details</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* Left column: scheduling info */}
                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md">
                        <div className="mb-3">
                            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200">Schedule</h3>
                        </div>
                        <DetailItem label="Title" value={title} />
                        <DetailItem label="Event Type" value={extendedProps.eventType} />
                        <DetailItem label="Start" value={formatDateTime(start)} />
                        <DetailItem label="End" value={formatDateTime(actualEndDate)} />
                        <DetailItem label="Location" value={extendedProps.roomName} />
                        <DetailItem label="Status" value={getStatusBadge(extendedProps.statusName)} />
                        <DetailItem label="Created On" value={formatDateTime(new Date(extendedProps.creationDate))} />
                    </div>

                    {/* Right column: targets and participants */}
                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md">
                        <div className="mb-3">
                            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200">Targets & Participants</h3>
                        </div>
                        <DetailItem label="Targets" value={extendedProps.relevantParties || 'Unassigned'} />
                        <div className="mb-4">
                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Employees</p>
                            <div className="mt-2 flex flex-wrap gap-2 items-center">
                                {extendedProps.employees && extendedProps.employees.length > 0 ? (
                                    (() => {
                                        const items: string[] = extendedProps.employees || [];
                                        const VISIBLE = 5;
                                        const extra = items.length - VISIBLE;
                                        const toShow = showAllEmployees ? items : items.slice(0, VISIBLE);
                                        return (
                                            <>
                                                {toShow.map((e: string) => (
                                                    <span key={e} className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-sm px-2 py-1 rounded">{e}</span>
                                                ))}
                                                {extra > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowAllEmployees(!showAllEmployees)}
                                                        className="bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-sm px-2 py-1 rounded text-gray-700 dark:text-gray-200 hover:bg-gray-200"
                                                    >
                                                        {showAllEmployees ? 'Show less' : `+${extra}`}
                                                    </button>
                                                )}
                                            </>
                                        );
                                    })()
                                ) : (
                                    <span className="text-sm text-gray-500">None</span>
                                )}
                            </div>
                        </div>
                        <div className="mb-4">
                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Positions</p>
                            <div className="mt-2 flex flex-wrap gap-2 items-center">
                                {extendedProps.positions && extendedProps.positions.length > 0 ? (
                                    (() => {
                                        const items: string[] = extendedProps.positions || [];
                                        const VISIBLE = 5;
                                        const extra = items.length - VISIBLE;
                                        const toShow = showAllPositions ? items : items.slice(0, VISIBLE);
                                        return (
                                            <>
                                                {toShow.map((p: string) => (
                                                    <span key={p} className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-sm px-2 py-1 rounded">{p}</span>
                                                ))}
                                                {extra > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowAllPositions(!showAllPositions)}
                                                        className="bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-sm px-2 py-1 rounded text-gray-700 dark:text-gray-200 hover:bg-gray-200"
                                                    >
                                                        {showAllPositions ? 'Show less' : `+${extra}`}
                                                    </button>
                                                )}
                                            </>
                                        );
                                    })()
                                ) : (
                                    <span className="text-sm text-gray-500">None</span>
                                )}
                            </div>
                        </div>
                        <DetailItem label="Max Attendees" value={extendedProps.maxAttendees ?? 'N/A'} />
                        <DetailItem label="Min Attendees" value={extendedProps.minAttendees ?? 'N/A'} />
                    </div>
                </div>
                <div className="mt-6 flex justify-between items-center flex-wrap gap-3">
                    {/* RSVP controls (visible if backend says eligible) */}
                    {canShowRSVP && (
                        <div className="flex items-center gap-2">
                            {typeof maxAtt === 'number' && (
                                <span className="text-xs text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                                    {bookedCount ?? 0}/{maxAtt} booked{typeof spotsLeft === 'number' ? ` • ${spotsLeft} left` : ''}
                                </span>
                            )}
                            <Button
                                onClick={() => doRSVP('book')}
                                variant={myBooking === 'Booked' ? 'primary' : 'outline'}
                                disabled={!canBookNow() || rsvpLoading === 'reject'}
                            >
                                {rsvpLoading === 'book' ? 'Booking...' : (myBooking === 'Booked' ? 'Booked' : 'Book')}
                            </Button>
                            <Button
                                onClick={() => doRSVP('reject')}
                                variant={myBooking === 'Rejected' ? 'danger' : 'outline'}
                                disabled={rsvpLoading === 'book'}
                            >
                                {rsvpLoading === 'reject' ? 'Updating...' : (myBooking === 'Rejected' ? 'Rejected' : 'Reject')}
                            </Button>
                        </div>
                    )}
                    {/* Completed: show attendance state */}
                    {isCompleted && (
                        <div className="flex items-center gap-2">
                            {typeof maxAtt === 'number' && (
                                <span className="text-xs text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                                    Attended: {bookedCount ?? 0}
                                </span>
                            )}
                            {myBooking && (
                                <span className={`text-xs px-2 py-1 rounded ${myBooking === 'Attended' ? 'bg-green-600 text-white' : 'bg-gray-400 text-white'}`}>
                                    You: {myBooking}
                                </span>
                            )}
                        </div>
                    )}

                    {/* Edit/Delete/Close */}
                    <div className="flex justify-end space-x-3">
                        {canManage && (
                            <>
                                <Button onClick={() => onEdit(event)} variant="outline">
                                    Edit
                                </Button>
                                <Button onClick={() => onDelete(event)} variant="danger">
                                    Delete
                                </Button>
                            </>
                        )}
                        <Button onClick={onClose} variant="primary">
                            Close
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EventDetailModal;