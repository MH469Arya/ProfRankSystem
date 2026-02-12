import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Button } from './ui/SharedComponents';

// Fake teachers data
// const fakeTeachers = [
//     { id: 't1', name: "Professor 1", subject: "Machine Learning" },
//     { id: 't2', name: "Professor 2", subject: "Data Structures" },
//     { id: 't3', name: "Professor 3", subject: "AI & Ethics" },
//     { id: 't4', name: "Professor 4", subject: "Database Systems" },
//     { id: 't5', name: "Professor 5", subject: "Web Technologies" },
// ];
// Replace the fakeTeachers array with an empty state

export default function Voting() {
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState('loading'); // 'loading' | 'valid' | 'invalid' | 'expired' | 'submitted'
    const [remainingTime, setRemainingTime] = useState(0);

    // Two lists state: available (bottom) and ranked (top)
    const [availableTeachers, setAvailableTeachers] = useState();
    const [rankedTeachers, setRankedTeachers] = useState([]);

    const [title, setTitle] = useState('Voting Page');

    // useEffect(() => {
    //     const div = searchParams.get('div');
    //     const token = searchParams.get('t');

    //     if (!div || !token) {
    //         setStatus('invalid');
    //         return;
    //     }

    //     if (!token.startsWith('dev-')) {
    //         setStatus('invalid');
    //         return;
    //     }

    //     setStatus('valid');
    //     setRemainingTime(300); // 5 mins

    //     // Parse title
    //     try {
    //         const parts = div.split('-');
    //         if (parts.length >= 2) {
    //             const dept = parts[0].toUpperCase();
    //             const classPart = parts.slice(1).join(' ').toUpperCase();
    //             setTitle(`Voting for ${dept} - ${classPart}`);
    //         }
    //     } catch (e) {
    //         console.error("Error parsing div", e);
    //     }

    // }, [searchParams]);
    useEffect(() => {
    // Extract variables from URL first
    const div = searchParams.get('div');
    const token = searchParams.get('t');

    // 1. Validation Logic
    if (!div || !token || !token.startsWith('dev-')) {
        setStatus('invalid');
        return;
    }

    // 2. Parse Title (Optional but nice for UX)
    try {
        const parts = div.split('-');
        if (parts.length >= 2) {
            const dept = parts[0].toUpperCase();
            const classPart = parts.slice(1).join(' ').toUpperCase();
            setTitle(`Voting for ${dept} - ${classPart}`);
        }
    } catch (e) {
        console.error("Error parsing div", e);
    }

    // 3. Define and Call the fetch function
    const fetchTeachers = async () => {
        try {
            const response = await fetch(`http://localhost:5000/api/teachers?div=${div}`);
            if (!response.ok) throw new Error("Failed to load");
            const data = await response.json();
            
            setAvailableTeachers(data); 
            setStatus('valid'); 
            setRemainingTime(300); // Start timer only after data is loaded
        } catch (err) {
            console.error(err);
            setStatus('invalid');
        }
    };

    fetchTeachers();
}, [searchParams]); // Dependencies: only re-run if URL params change

    // Countdown timer
    useEffect(() => {
        if (status !== 'valid' || remainingTime <= 0) return;

        const interval = setInterval(() => {
            setRemainingTime((prev) => {
                if (prev <= 1) {
                    setStatus('expired');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [status, remainingTime]);

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    // Moves an item from one list to another or reorders within the same list
    const move = (source, destination, droppableSource, droppableDestination) => {
        const sourceClone = Array.from(source);
        const destClone = Array.from(destination);
        const [removed] = sourceClone.splice(droppableSource.index, 1);

        destClone.splice(droppableDestination.index, 0, removed);

        return {
            [droppableSource.droppableId]: sourceClone,
            [droppableDestination.droppableId]: destClone,
        };
    };

    const reorder = (list, startIndex, endIndex) => {
        const result = Array.from(list);
        const [removed] = result.splice(startIndex, 1);
        result.splice(endIndex, 0, removed);
        return result;
    };

    const onDragEnd = (result) => {
        const { source, destination } = result;

        // Dropped outside the list
        if (!destination) {
            return;
        }

        // Reordering within the same list
        if (source.droppableId === destination.droppableId) {
            const items = source.droppableId === 'ranked' ? rankedTeachers : availableTeachers;
            const reorderedItems = reorder(items, source.index, destination.index);

            if (source.droppableId === 'ranked') {
                setRankedTeachers(reorderedItems);
            } else {
                setAvailableTeachers(reorderedItems);
            }
        } else {
            // Moving between lists
            const resultList = move(
                source.droppableId === 'ranked' ? rankedTeachers : availableTeachers,
                destination.droppableId === 'ranked' ? rankedTeachers : availableTeachers,
                source,
                destination
            );

            if (source.droppableId === 'ranked') {
                setRankedTeachers(resultList.ranked);
                setAvailableTeachers(resultList.available);
            } else {
                setAvailableTeachers(resultList.available);
                setRankedTeachers(resultList.ranked);
            }
        }
    };

    // Ranking Arrows Logic
    const moveUp = (index) => {
        if (index === 0) return;
        const newRanked = [...rankedTeachers];
        [newRanked[index - 1], newRanked[index]] = [newRanked[index], newRanked[index - 1]];
        setRankedTeachers(newRanked);
    };

    const moveDown = (index) => {
        if (index === rankedTeachers.length - 1) return;
        const newRanked = [...rankedTeachers];
        [newRanked[index + 1], newRanked[index]] = [newRanked[index], newRanked[index + 1]];
        setRankedTeachers(newRanked);
    };

    // const handleSubmit = () => {
    //     setStatus('submitted');
    // };
    const handleSubmit = async () => {
    // 1. Get the current URL parameters
    const token = searchParams.get('t');
    const div = searchParams.get('div');

    // 2. Map the ranked teachers to an array of just their IDs
    // Example: [{id: 3, name: '...'}, {id: 1, name: '...'}] becomes [3, 1]
    const rankingIds = rankedTeachers.map(teacher => teacher.id);

    try {
        const response = await fetch('http://localhost:5000/api/vote', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                token: token,      // Unique student identifier
                division: div,     // Class/Year group
                rankings: rankingIds // The ordered list for Borda calculation
            }),
        });

        if (response.ok) {
            setStatus('submitted'); // Show success screen
        } else {
            const errData = await response.json();
            alert(errData.message || "Failed to submit vote");
        }
    } catch (error) {
        console.error("Submission error:", error);
        alert("Server error. Please try again later.");
    }
};

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <p className="text-lg text-gray-600">Loading voting session...</p>
            </div>
        );
    }

    if (status === 'invalid' || status === 'expired') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white p-4">
                <div className="border border-black p-8 text-center max-w-md w-full">
                    <h1 className="text-2xl font-bold uppercase mb-4">Error</h1>
                    <p className="text-gray-700">
                        {status === 'invalid'
                            ? 'This voting link is invalid.'
                            : 'This voting session has expired.'}
                    </p>
                </div>
            </div>
        );
    }

    if (status === 'submitted') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white p-4">
                <div className="border border-black p-8 text-center max-w-md w-full">
                    <h1 className="text-2xl font-bold uppercase mb-4">Success</h1>
                    <p className="text-gray-700">Your vote has been submitted successfully.</p>
                    <div className="mt-6 text-left max-w-sm mx-auto">
                        <h3 className="font-bold underline mb-2">You Ranked:</h3>
                        <ol className="list-decimal list-inside">
                            {rankedTeachers.map(t => (
                                <li key={t.id}>{t.name}</li>
                            ))}
                        </ol>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-2xl md:text-3xl font-bold uppercase tracking-wide mb-6 text-center">
                    {title}
                </h1>

                <div className="border border-black p-4 mb-4 text-center max-w-xs mx-auto">
                    <p className="text-lg font-medium">
                        Time remaining: {formatTime(remainingTime)}
                    </p>
                </div>

                <DragDropContext onDragEnd={onDragEnd}>
                    <div className="grid md:grid-cols-1 gap-8">

                        {/* Rank Professors Box (Top) */}
                        <div className="border-2 border-black p-4 min-h-[300px] bg-gray-50">
                            <h2 className="text-xl font-bold uppercase mb-4 text-center border-b border-black pb-2">Rank Professors</h2>
                            <p className="text-sm text-gray-500 text-center mb-4 italic">Drag professors here to rank them</p>

                            <Droppable droppableId="ranked">
                                {(provided) => (
                                    <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3 min-h-[200px]">
                                        {rankedTeachers.map((teacher, index) => (
                                            <Draggable key={teacher.id} draggableId={teacher.id.toString()} index={index}>
                                                {(provided) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        {...provided.dragHandleProps}
                                                        className="border border-black p-3 flex items-center justify-between bg-white shadow-sm"
                                                    >
                                                        <div className="flex items-center">
                                                            <span className="text-2xl font-bold mr-4 w-8 text-center text-blue-600">
                                                                {index + 1}
                                                            </span>
                                                            <div>
                                                                <p className="font-bold text-lg">{teacher.name}</p>
                                                                <p className="text-xs text-gray-500">{teacher.subject}</p>
                                                            </div>
                                                        </div>

                                                        <div className="flex flex-col space-y-1">
                                                            <button
                                                                onClick={() => moveUp(index)}
                                                                disabled={index === 0}
                                                                className={`p-1 hover:bg-gray-100 rounded ${index === 0 ? 'text-gray-300' : 'text-black'}`}
                                                                title="Move Up"
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                                                </svg>
                                                            </button>
                                                            <button
                                                                onClick={() => moveDown(index)}
                                                                disabled={index === rankedTeachers.length - 1}
                                                                className={`p-1 hover:bg-gray-100 rounded ${index === rankedTeachers.length - 1 ? 'text-gray-300' : 'text-black'}`}
                                                                title="Move Down"
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        </div>

                        {/* Your Professors Box (Bottom) */}
                        <div className="border border-gray-300 p-4 min-h-[200px]">
                            <h2 className="text-lg font-bold uppercase mb-4 text-center text-gray-700">Your Professors</h2>
                            <Droppable droppableId="available">
                                {(provided) => (
                                    <div {...provided.droppableProps} ref={provided.innerRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {availableTeachers.map((teacher, index) => (
                                            <Draggable key={teacher.id} draggableId={teacher.id.toString()} index={index}>
                                                {(provided) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        {...provided.dragHandleProps}
                                                        className="border border-gray-400 p-3 bg-white hover:bg-gray-50 flex flex-col justify-center text-center cursor-grab active:cursor-grabbing"
                                                    >
                                                        <p className="font-semibold text-md">{teacher.name}</p>
                                                        <p className="text-xs text-gray-500 mt-1">{teacher.subject}</p>
                                                    </div>
                                                )}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        </div>

                    </div>

                    <div className="mt-8 text-center sticky bottom-4">
                        <Button
                            onClick={handleSubmit}
                            disabled={rankedTeachers.length === 0}
                            className={`w-full md:w-1/3 px-8 py-3 text-lg shadow-xl ${rankedTeachers.length > 0 ? 'bg-black text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                }`}
                        >
                            Submit Ranking
                        </Button>
                    </div>
                </DragDropContext>
            </div>
        </div>
    );
}