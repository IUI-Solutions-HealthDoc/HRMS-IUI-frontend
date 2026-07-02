"use client";

import { useEffect, useState } from "react";
import { Star, Search, MessageSquare, ShieldAlert, Award, TrendingUp, Users } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import Loader from "@/components/ui/Loader";

function StarRow({ value = 0, onChange, readOnly = false, size = 18 }) {
  const safeValue = Math.max(0, Math.min(5, Number(value || 0)));
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= safeValue;
        const icon = (
          <Star
            size={size}
            className={`transition-all ${
              filled ? "text-amber-400 fill-amber-400" : "text-slate-600 fill-transparent"
            }`}
          />
        );
        if (readOnly) {
          return <span key={star}>{icon}</span>;
        }
        return (
          <button
            key={star}
            type="button"
            onClick={() => onChange?.(star)}
            className="focus:outline-none hover:scale-110 active:scale-95 transition-transform"
          >
            {icon}
          </button>
        );
      })}
    </div>
  );
}

export default function PeerRatingsPage() {
  const { role, user } = useAuth();
  const { showToast } = useToast();
  
  const [activeTab, setActiveTab] = useState("give"); // "give" | "my" | "admin"
  const [loading, setLoading] = useState(true);
  
  // Give tab states
  const [employees, setEmployees] = useState([]);
  const [searchEmployee, setSearchEmployee] = useState("");
  const [selectedEmpId, setSelectedEmpId] = useState("");
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState("");
  const [givenRatings, setGivenRatings] = useState([]);
  const [submitLoading, setSubmitLoading] = useState(false);

  // My Received stats
  const [receivedStats, setReceivedStats] = useState({
    average_rating: 0,
    ratings_count: 0,
    feedback_list: []
  });

  // Admin dashboard states
  const [allRatings, setAllRatings] = useState([]);
  const [summary, setSummary] = useState([]);
  const [searchSummary, setSearchSummary] = useState("");
  
  const isPrivileged = ["admin", "hr", "hod", "tl"].includes(role);

  const loadData = async () => {
    setLoading(true);
    try {
      const empData = await apiFetch("/peer-ratings/employees");
      setEmployees(empData || []);
      
      const givenData = await apiFetch("/peer-ratings/my-given");
      setGivenRatings(givenData || []);
      
      const receivedData = await apiFetch("/peer-ratings/received");
      setReceivedStats(receivedData || { average_rating: 0, ratings_count: 0, feedback_list: [] });
      
      if (isPrivileged) {
        const allData = await apiFetch("/peer-ratings/all");
        setAllRatings(allData?.ratings || []);
        setSummary(allData?.summary || []);
      }
    } catch (err) {
      showToast(err.message || "Failed to load ratings data", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [role]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedEmpId) {
      showToast("Please select an employee to rate", "error");
      return;
    }
    setSubmitLoading(true);
    try {
      await apiFetch("/peer-ratings", {
        method: "POST",
        body: JSON.stringify({
          ratee_id: parseInt(selectedEmpId),
          rating,
          feedback: feedback.trim() || null
        })
      });
      showToast("Rating submitted successfully!");
      setSelectedEmpId("");
      setSearchEmployee("");
      setRating(5);
      setFeedback("");
      
      const givenData = await apiFetch("/peer-ratings/my-given");
      setGivenRatings(givenData || []);
      if (isPrivileged) {
        const allData = await apiFetch("/peer-ratings/all");
        setAllRatings(allData?.ratings || []);
        setSummary(allData?.summary || []);
      }
    } catch (err) {
      showToast(err.message || "Failed to submit rating", "error");
    } finally {
      setSubmitLoading(false);
    }
  };

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchEmployee.toLowerCase()) ||
    emp.username.toLowerCase().includes(searchEmployee.toLowerCase()) ||
    emp.department.toLowerCase().includes(searchEmployee.toLowerCase())
  );

  const filteredSummary = summary.filter(emp =>
    emp.employee_name.toLowerCase().includes(searchSummary.toLowerCase()) ||
    emp.username.toLowerCase().includes(searchSummary.toLowerCase()) ||
    emp.department.toLowerCase().includes(searchSummary.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader size="large" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 text-slate-100">
      {/* Header Banner */}
      <div className="relative bg-gradient-to-r from-violet-950 via-slate-900 to-slate-900 border border-violet-900/40 rounded-2xl p-6 overflow-hidden shadow-2xl shadow-indigo-950/20">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-full px-3 py-1 text-xs text-violet-300 font-medium">
            ⭐ Peer-to-Peer Feedback
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Peer Rating System</h1>
          <p className="text-slate-400 text-sm max-w-2xl">
            Submit ratings and construct positive feedback for your team members. Peer ratings are completely anonymous to the recipients.
          </p>
        </div>
        <div className="absolute right-0 top-0 w-80 h-80 bg-violet-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
      </div>

      {/* Tabs Menu */}
      <div className="flex items-center gap-1 border-b border-slate-800 pb-px">
        <button
          onClick={() => setActiveTab("give")}
          className={`px-4 py-2.5 font-medium text-sm border-b-2 transition-all ${
            activeTab === "give"
              ? "border-indigo-500 text-indigo-400 bg-indigo-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          Give Rating
        </button>
        <button
          onClick={() => setActiveTab("my")}
          className={`px-4 py-2.5 font-medium text-sm border-b-2 transition-all ${
            activeTab === "my"
              ? "border-indigo-500 text-indigo-400 bg-indigo-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          My Performance
        </button>
        {isPrivileged && (
          <button
            onClick={() => setActiveTab("admin")}
            className={`px-4 py-2.5 font-medium text-sm border-b-2 transition-all ${
              activeTab === "admin"
                ? "border-indigo-500 text-indigo-400 bg-indigo-500/5"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Ratings Dashboard
          </button>
        )}
      </div>

      {/* TAB 1: Give Rating */}
      {activeTab === "give" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Rating Form */}
          <div className="lg:col-span-1 bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-xl p-5 md:p-6 space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Award className="text-indigo-400" size={20} />
              Rate a Colleague
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Select Colleague
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 pointer-events-none">
                    <Search size={16} />
                  </span>
                  <input
                    type="text"
                    placeholder="Search colleague name..."
                    value={searchEmployee}
                    onChange={(e) => {
                      setSearchEmployee(e.target.value);
                      if (selectedEmpId) setSelectedEmpId("");
                    }}
                    className="w-full pl-9 pr-4 py-2 bg-slate-950/80 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                {searchEmployee && !selectedEmpId && (
                  <div className="absolute mt-1 max-h-40 overflow-y-auto bg-slate-950 border border-slate-800 rounded-lg divide-y divide-slate-900 z-25 w-[calc(100%-2.5rem)] lg:w-[calc(33.33%-2.5rem)] shadow-xl shadow-black/80">
                    {filteredEmployees.length > 0 ? (
                      filteredEmployees.map((emp) => (
                        <button
                          key={emp.id}
                          type="button"
                          onClick={() => {
                            setSelectedEmpId(emp.id);
                            setSearchEmployee(emp.name);
                          }}
                          className={`w-full text-left px-3 py-2 text-xs transition-colors hover:bg-slate-900 ${
                            selectedEmpId === emp.id ? "bg-indigo-500/10 text-indigo-300" : "text-slate-300"
                          }`}
                        >
                          <div className="font-semibold">{emp.name} (@{emp.username})</div>
                          <div className="text-[10px] text-slate-500">{emp.department} · {emp.job_title}</div>
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-xs text-slate-500">No active colleagues found</div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Rating
                </label>
                <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3">
                  <StarRow value={rating} onChange={setRating} size={24} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Anonymous Feedback / Comments
                </label>
                <textarea
                  rows={4}
                  placeholder="Tell them what they are doing great or how they can improve..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitLoading || !selectedEmpId}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-medium py-2 rounded-lg transition-all shadow-lg shadow-indigo-950/20 active:scale-[0.98]"
              >
                {submitLoading ? "Submitting..." : "Submit Rating"}
              </button>
            </form>
          </div>

          {/* Ratings Given */}
          <div className="lg:col-span-2 bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-xl p-5 md:p-6 space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <MessageSquare className="text-indigo-400" size={20} />
              Ratings Submitted by Me
            </h2>
            {givenRatings.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                      <th className="pb-3">Colleague</th>
                      <th className="pb-3">Rating</th>
                      <th className="pb-3">Comments</th>
                      <th className="pb-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {givenRatings.map((r) => (
                      <tr key={r.id} className="text-slate-300 hover:bg-slate-900/20">
                        <td className="py-3 font-semibold text-slate-200">
                          {r.ratee_name}
                          <span className="block text-[10px] text-slate-500">@{r.ratee_username}</span>
                        </td>
                        <td className="py-3">
                          <StarRow value={r.rating} readOnly size={14} />
                        </td>
                        <td className="py-3 max-w-xs truncate text-slate-400" title={r.feedback}>
                          {r.feedback || "—"}
                        </td>
                        <td className="py-3 text-slate-500">
                          {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(r.created_at))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-10 border border-dashed border-slate-800 rounded-xl">
                <p className="text-slate-500 text-sm">You haven't rated any colleagues yet.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: My Received Ratings */}
      {activeTab === "my" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Aggregates */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-xl p-5 md:p-6 space-y-5 text-center">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                My Average Rating
              </h2>
              <div className="space-y-2">
                <div className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-200">
                  {receivedStats.average_rating}
                </div>
                <div className="flex justify-center">
                  <StarRow value={receivedStats.average_rating} readOnly size={22} />
                </div>
                <p className="text-slate-500 text-xs">
                  Based on {receivedStats.ratings_count} anonymous peer ratings
                </p>
              </div>
            </div>

            <div className="bg-slate-900/60 backdrop-blur-md border border-red-900/20 rounded-xl p-5 md:p-6 space-y-3">
              <h3 className="text-sm font-semibold text-red-400 flex items-center gap-2">
                <ShieldAlert size={16} />
                Anonymity Guarantee
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                To promote honest feedback, the identities of your raters are entirely hidden. Rater names, usernames, profile IDs, and submission timestamps are scrubbed from employee performance views.
              </p>
            </div>
          </div>

          {/* Anonymous Feedback Comments */}
          <div className="lg:col-span-2 bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-xl p-5 md:p-6 space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <MessageSquare className="text-indigo-400" size={20} />
              Anonymous Peer Comments
            </h2>
            {receivedStats.feedback_list.length > 0 ? (
              <div className="space-y-3">
                {receivedStats.feedback_list.map((comment, index) => (
                  <div
                    key={index}
                    className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-lg text-slate-300 text-sm leading-relaxed"
                  >
                    "{comment}"
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl">
                <p className="text-slate-500 text-sm">No feedback comments received yet.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Admin/HOD/HR Dashboard */}
      {activeTab === "admin" && isPrivileged && (
        <div className="space-y-6">
          {/* Summary Grid */}
          <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-xl p-5 md:p-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Users className="text-indigo-400" size={20} />
                Employee Peer Rating Summaries
              </h2>
              <div className="relative max-w-xs">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 pointer-events-none">
                  <Search size={16} />
                </span>
                <input
                  type="text"
                  placeholder="Search employees..."
                  value={searchSummary}
                  onChange={(e) => setSearchSummary(e.target.value)}
                  className="pl-9 pr-4 py-1.5 bg-slate-950/80 border border-slate-800 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            {filteredSummary.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                      <th className="pb-3">Employee</th>
                      <th className="pb-3">Department</th>
                      <th className="pb-3">Average Rating</th>
                      <th className="pb-3">Ratings Received</th>
                      <th className="pb-3">Ratings Given</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredSummary.map((emp) => (
                      <tr key={emp.user_id} className="text-slate-300 hover:bg-slate-900/20">
                        <td className="py-3 font-semibold text-slate-200">
                          {emp.employee_name}
                          <span className="block text-[10px] text-slate-500">@{emp.username}</span>
                        </td>
                        <td className="py-3 text-slate-400">
                          {emp.department}
                          <span className="block text-[10px] text-slate-500">{emp.job_title}</span>
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-amber-400">{emp.avg_rating_received}</span>
                            <StarRow value={emp.avg_rating_received} readOnly size={12} />
                          </div>
                        </td>
                        <td className="py-3 font-medium text-slate-200">
                          {emp.ratings_received_count}
                        </td>
                        <td className="py-3 font-medium text-slate-200">
                          {emp.ratings_given_count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-10">
                <p className="text-slate-500 text-sm">No rating summaries found.</p>
              </div>
            )}
          </div>

          {/* Audit Logs / Transaction Details */}
          <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-xl p-5 md:p-6 space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="text-indigo-400" size={20} />
              Detailed Transaction Log (Privileged View)
            </h2>
            {allRatings.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                      <th className="pb-3">Rater</th>
                      <th className="pb-3">Ratee</th>
                      <th className="pb-3">Score</th>
                      <th className="pb-3">Feedback / Comments</th>
                      <th className="pb-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {allRatings.map((r) => (
                      <tr key={r.id} className="text-slate-300 hover:bg-slate-900/20">
                        <td className="py-3 text-slate-200 font-medium">
                          {r.rater_name}
                          <span className="block text-[10px] text-slate-500">@{r.rater_username}</span>
                        </td>
                        <td className="py-3 text-slate-200 font-medium">
                          {r.ratee_name}
                          <span className="block text-[10px] text-slate-500">@{r.ratee_username}</span>
                        </td>
                        <td className="py-3">
                          <StarRow value={r.rating} readOnly size={12} />
                        </td>
                        <td className="py-3 text-slate-400 max-w-sm whitespace-pre-wrap leading-relaxed">
                          {r.feedback || <span className="italic text-slate-600">No comment</span>}
                        </td>
                        <td className="py-3 text-slate-500">
                          {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(r.created_at))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-10 border border-dashed border-slate-800 rounded-xl">
                <p className="text-slate-500 text-sm">No peer ratings submitted yet.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
