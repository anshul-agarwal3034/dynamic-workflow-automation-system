const FormsListView = () => {
  return (
    <div className="w-full max-w-4xl bg-white rounded-xl border border-slate-200 shadow-lg p-8 text-center my-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Forms List — Coming in Task 4</h1>
      <p className="text-xs text-slate-500">Route: /forms</p>
    </div>
  );
};

const FormCreateView = () => {
  return (
    <div className="w-full max-w-4xl bg-white rounded-xl border border-slate-200 shadow-lg p-8 text-center my-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Create Form — Coming in Task 4</h1>
      <p className="text-xs text-slate-500">Route: /forms/create</p>
    </div>
  );
};

const FormDetailView = () => {
  const { id } = ReactRouterDOM.useParams();
  return (
    <div className="w-full max-w-4xl bg-white rounded-xl border border-slate-200 shadow-lg p-8 text-center my-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Form Details — Coming in Task 4</h1>
      <p className="text-xs text-slate-500">Route: /forms/{id}</p>
    </div>
  );
};

const FormEditView = () => {
  const { id } = ReactRouterDOM.useParams();
  return (
    <div className="w-full max-w-4xl bg-white rounded-xl border border-slate-200 shadow-lg p-8 text-center my-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Edit Form — Coming in Task 4</h1>
      <p className="text-xs text-slate-500">Route: /forms/{id}/edit</p>
    </div>
  );
};
