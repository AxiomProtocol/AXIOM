import React from "react";
export default function RoadmapTimeline({ milestones }) {
  return (
    <div className="max-w-4xl mx-auto">
      <ol className="relative border-l border-gray-300">
        {milestones.map((m,i)=>(
          <li key={i} className="mb-10 ml-6">
            <span className="absolute flex items-center justify-center w-6 h-6 bg-indigo-600 rounded-full -left-3 ring-8 ring-white text-white text-sm">{i+1}</span>
            <h3 className="mb-1 text-lg font-semibold">{m.title}
              {m.status && <span className={`ml-3 text-xs px-2.5 py-0.5 rounded ${m.status==="completed"?"bg-green-100 text-green-800":m.status==="in-progress"?"bg-yellow-100 text-yellow-800":"bg-gray-100 text-gray-800"}`}>{m.status.replace("-"," ")}</span>}
            </h3>
            <time className="block mb-2 text-sm text-gray-500">{m.date}</time>
            <p className="text-gray-700">{m.description}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}