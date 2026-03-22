"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Coins,
  FileCheck2,
  Files,
  ShieldCheck,
  UploadCloud,
  X
} from "lucide-react";
import TokenizationPreviewCard from "@/components/tokenization/TokenizationPreviewCard";

var STEPS = [
  { id: 1, key: "property", label: "Property DNA", icon: Building2 },
  { id: 2, key: "financials", label: "Financial Engineering", icon: Coins },
  { id: 3, key: "legal", label: "Legal & Compliance", icon: ShieldCheck },
  { id: 4, key: "media", label: "Media & Docs", icon: Files }
];

var REQUIRED_FIELDS = [
  "propertyName",
  "address",
  "assetType",
  "description",
  "totalCapitalRaise",
  "tokenPrice",
  "estimatedAnnualYield",
  "dividendFrequency",
  "regulationType",
  "spvName"
];

function getCurrentCreator() {
  try {
    var currentUserId = window.localStorage.getItem("bricksnexus_current_user_id");
    var users = JSON.parse(window.localStorage.getItem("bricksnexus_users") || "[]");
    if (!currentUserId || !Array.isArray(users)) return null;
    return users.find(function(user) {
      return String(user.id) === String(currentUserId);
    }) || null;
  } catch (error) {
    console.error("Unable to read current creator", error);
    return null;
  }
}

export default function TokenizationOpportunityForm() {
  var [currentStep, setCurrentStep] = useState(1);
  var [toast, setToast] = useState(null);
  var toastTimerRef = useRef(null);

  var {
    register,
    handleSubmit,
    setValue,
    watch,
    trigger,
    getValues,
    reset,
    formState: { errors }
  } = useForm({
    defaultValues: {
      propertyName: "",
      address: "",
      assetType: "",
      description: "",
      totalCapitalRaise: "",
      tokenPrice: "",
      estimatedAnnualYield: "",
      dividendFrequency: "",
      regulationType: "",
      spvName: "",
      smartContractAddress: "",
      propertyImages: [],
      legalDocuments: []
    },
    mode: "onChange"
  });

  var values = watch();
  var isPublishReady = useMemo(function() {
    return REQUIRED_FIELDS.every(function(field) {
      return String(values[field] || "").trim() !== "";
    });
  }, [values]);

  useEffect(function() {
    try {
      var storedDraft = window.localStorage.getItem("bricksnexus_tokenization_draft");
      if (!storedDraft) return;

      var parsedDraft = JSON.parse(storedDraft);
      if (parsedDraft && parsedDraft.formValues) {
        reset(parsedDraft.formValues);
      }
    } catch (error) {
      console.error("Unable to load tokenization draft", error);
    }
  }, [reset]);

  function showToast(type, title, message) {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }

    setToast({ type: type, title: title, message: message });
    toastTimerRef.current = window.setTimeout(function() {
      setToast(null);
    }, 3200);
  }

  function handleFiles(field, fileList) {
    var existing = getValues(field) || [];
    var nextFiles = existing.concat(Array.from(fileList || []).map(function(file) {
      return {
        id: field + "-" + file.name + "-" + file.size + "-" + Date.now(),
        name: file.name,
        size: file.size,
        type: file.type || "file"
      };
    }));

    setValue(field, nextFiles, { shouldValidate: true, shouldDirty: true });
  }

  function removeFile(field, id) {
    var nextFiles = (getValues(field) || []).filter(function(file) {
      return file.id !== id;
    });
    setValue(field, nextFiles, { shouldValidate: true, shouldDirty: true });
  }

  async function goNext() {
    var fieldsByStep = {
      1: ["propertyName", "address", "assetType", "description"],
      2: ["totalCapitalRaise", "tokenPrice", "estimatedAnnualYield", "dividendFrequency"],
      3: ["regulationType", "spvName"],
      4: []
    };

    var isValid = await trigger(fieldsByStep[currentStep]);
    if (!isValid) {
      showToast("error", "Missing required information", "Please complete the highlighted fields before moving forward.");
      return;
    }
    setCurrentStep(function(prev) {
      return Math.min(prev + 1, STEPS.length);
    });
  }

  function goBack() {
    setCurrentStep(function(prev) {
      return Math.max(prev - 1, 1);
    });
  }

  function buildSubmissionData(status) {
    var snapshot = getValues();
    var creator = getCurrentCreator();
    return {
      schema: "TokenizationOpportunity",
      type: "tokenization",
      status: status,
      creatorUserId: creator ? creator.id : "",
      creatorName: creator ? creator.name || creator.initials || "" : "",
      creatorEmail: creator ? creator.email || "" : "",
      property: {
        propertyName: snapshot.propertyName,
        address: snapshot.address,
        assetType: snapshot.assetType,
        description: snapshot.description
      },
      financials: {
        totalCapitalRaise: Number(snapshot.totalCapitalRaise || 0),
        tokenPrice: Number(snapshot.tokenPrice || 0),
        estimatedAnnualYield: Number(snapshot.estimatedAnnualYield || 0),
        dividendFrequency: snapshot.dividendFrequency
      },
      legalCompliance: {
        regulationType: snapshot.regulationType,
        spvName: snapshot.spvName,
        smartContractAddress: snapshot.smartContractAddress || ""
      },
      mediaDocuments: {
        propertyImages: snapshot.propertyImages || [],
        legalDocuments: snapshot.legalDocuments || []
      },
      marketplacePreview: {
        title: snapshot.propertyName,
        yield: snapshot.estimatedAnnualYield,
        tokenPrice: snapshot.tokenPrice,
        address: snapshot.address
      }
    };
  }

  function handleSaveDraft() {
    var submissionData = buildSubmissionData("draft");
    window.localStorage.setItem(
      "bricksnexus_tokenization_draft",
      JSON.stringify({
        savedAt: new Date().toISOString(),
        formValues: getValues(),
        submissionData: submissionData
      })
    );
    showToast("success", "Draft saved", "Your tokenization opportunity draft has been saved.");
  }

  var onSubmit = handleSubmit(function() {
    if (!isPublishReady) {
      showToast("error", "Publish blocked", "Fill every required field before publishing to the marketplace.");
      return;
    }

    var submissionData = buildSubmissionData("published");
    var existingPublished = [];

    try {
      existingPublished = JSON.parse(
        window.localStorage.getItem("bricksnexus_tokenization_submissions") || "[]"
      );
    } catch (error) {
      console.error("Unable to read published tokenization submissions", error);
    }

    existingPublished.unshift({
      id: "tokenization-" + Date.now(),
      publishedAt: new Date().toISOString(),
      submissionData: submissionData
    });

    window.localStorage.setItem(
      "bricksnexus_tokenization_submissions",
      JSON.stringify(existingPublished)
    );
    window.localStorage.removeItem("bricksnexus_tokenization_draft");
    showToast("success", "Published to marketplace", "Your tokenization opportunity is ready to populate marketplace cards and detail pages.");
  });

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <header className="token-card rounded-[2rem] p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">
              Tokenization Opportunity Builder
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-[-0.05em] text-slate-900">
              Submit a property for tokenization
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
              Structure the asset, define the financial engineering, attach compliance materials, and preview how the opportunity will appear on BricksNexus in real time.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
              Slate-900 / Blue-600 / Emerald-500
            </span>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">
              Creator Flow
            </span>
          </div>
        </div>
      </header>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <Stepper currentStep={currentStep} />

          <form onSubmit={onSubmit} className="token-card rounded-[2rem] p-6">
            {currentStep === 1 ? (
              <section className="space-y-5">
                <SectionHeading
                  title="Property DNA"
                  subtitle="Define the asset identity and narrative that will anchor the listing."
                />
                <div className="grid gap-5 md:grid-cols-2">
                  <Field
                    label="Property Name"
                    error={errors.propertyName?.message}
                    input={
                      <input
                        {...register("propertyName", { required: "Property name is required." })}
                        className={inputClass(errors.propertyName)}
                        placeholder="Miami Harbor Residences"
                      />
                    }
                  />
                  <Field
                    label="Asset Type"
                    error={errors.assetType?.message}
                    input={
                      <select
                        {...register("assetType", { required: "Asset type is required." })}
                        className={inputClass(errors.assetType)}
                      >
                        <option value="">Select asset type</option>
                        <option value="Residential">Residential</option>
                        <option value="Commercial">Commercial</option>
                        <option value="Industrial">Industrial</option>
                      </select>
                    }
                  />
                </div>
                <Field
                  label="Address"
                  error={errors.address?.message}
                  input={
                    <input
                      {...register("address", { required: "Address is required." })}
                      className={inputClass(errors.address)}
                      placeholder="Wynwood, Miami, Florida"
                    />
                  }
                />
                <Field
                  label="Bio / Description"
                  error={errors.description?.message}
                  input={
                    <textarea
                      {...register("description", { required: "Description is required." })}
                      className={inputClass(errors.description)}
                      rows={5}
                      placeholder="Describe the property, value creation plan, and investment narrative."
                    />
                  }
                />
              </section>
            ) : null}

            {currentStep === 2 ? (
              <section className="space-y-5">
                <SectionHeading
                  title="Financial Engineering"
                  subtitle="Set the raise mechanics investors will see in the purchase widget and marketplace."
                />
                <div className="grid gap-5 md:grid-cols-2">
                  <Field
                    label="Total Capital Raise"
                    error={errors.totalCapitalRaise?.message}
                    input={
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        {...register("totalCapitalRaise", { required: "Total capital raise is required." })}
                        className={inputClass(errors.totalCapitalRaise)}
                        placeholder="2500000"
                      />
                    }
                  />
                  <Field
                    label="Token Price"
                    error={errors.tokenPrice?.message}
                    input={
                      <input
                        type="number"
                        min="0"
                        step="1"
                        {...register("tokenPrice", { required: "Token price is required." })}
                        className={inputClass(errors.tokenPrice)}
                        placeholder="50"
                      />
                    }
                  />
                  <Field
                    label="Estimated Annual Yield (%)"
                    error={errors.estimatedAnnualYield?.message}
                    input={
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        {...register("estimatedAnnualYield", { required: "Estimated annual yield is required." })}
                        className={inputClass(errors.estimatedAnnualYield)}
                        placeholder="12.5"
                      />
                    }
                  />
                  <Field
                    label="Dividend Frequency"
                    error={errors.dividendFrequency?.message}
                    input={
                      <select
                        {...register("dividendFrequency", { required: "Dividend frequency is required." })}
                        className={inputClass(errors.dividendFrequency)}
                      >
                        <option value="">Select frequency</option>
                        <option value="Monthly">Monthly</option>
                        <option value="Quarterly">Quarterly</option>
                      </select>
                    }
                  />
                </div>
              </section>
            ) : null}

            {currentStep === 3 ? (
              <section className="space-y-5">
                <SectionHeading
                  title="Legal & Compliance"
                  subtitle="Capture the regulatory frame and operating entity for the issuance."
                />
                <div className="grid gap-5 md:grid-cols-2">
                  <Field
                    label="Regulation Type"
                    error={errors.regulationType?.message}
                    input={
                      <select
                        {...register("regulationType", { required: "Regulation type is required." })}
                        className={inputClass(errors.regulationType)}
                      >
                        <option value="">Select regulation</option>
                        <option value="Reg D">Reg D</option>
                        <option value="Reg S">Reg S</option>
                        <option value="Reg A+">Reg A+</option>
                      </select>
                    }
                  />
                  <Field
                    label="SPV / LLC Name"
                    error={errors.spvName?.message}
                    input={
                      <input
                        {...register("spvName", { required: "SPV/LLC name is required." })}
                        className={inputClass(errors.spvName)}
                        placeholder="BNX Miami Harbor SPV LLC"
                      />
                    }
                  />
                </div>
                <Field
                  label="Smart Contract Address"
                  help="Optional. Leave blank until deployment or prefill with a known address."
                  input={
                    <input
                      {...register("smartContractAddress")}
                      className={inputClass()}
                      placeholder="0x..."
                    />
                  }
                />
              </section>
            ) : null}

            {currentStep === 4 ? (
              <section className="space-y-5">
                <SectionHeading
                  title="Media & Docs"
                  subtitle="Upload the visuals and legal files that will support diligence and marketing."
                />
                <FileDropzone
                  label="Property Images"
                  description="Drag and drop property imagery or click to browse."
                  files={values.propertyImages || []}
                  onFilesAdded={(files) => handleFiles("propertyImages", files)}
                  onRemove={(id) => removeFile("propertyImages", id)}
                />
                <FileDropzone
                  label="Legal Documents"
                  description="Upload PPM, Appraisal, Title, and related legal materials."
                  files={values.legalDocuments || []}
                  onFilesAdded={(files) => handleFiles("legalDocuments", files)}
                  onRemove={(id) => removeFile("legalDocuments", id)}
                />
              </section>
            ) : null}

            <div className="mt-8 flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={goBack}
                  disabled={currentStep === 1}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ArrowLeft size={16} />
                  Back
                </button>
                {currentStep < STEPS.length ? (
                  <button
                    type="button"
                    onClick={goNext}
                    className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white"
                  >
                    Continue
                    <ArrowRight size={16} />
                  </button>
                ) : null}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700"
                >
                  Save as Draft
                </button>
                <button
                  type="submit"
                  disabled={!isPublishReady}
                  className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  Publish to Marketplace
                </button>
              </div>
            </div>
          </form>
        </div>

        <div className="space-y-6 xl:sticky xl:top-24 xl:self-start">
          <TokenizationPreviewCard values={values} />
        </div>
      </div>

      {toast ? <Toast toast={toast} /> : null}
    </div>
  );
}

function Stepper({ currentStep }) {
  return (
    <div className="token-card rounded-[2rem] p-4">
      <div className="grid gap-3 md:grid-cols-4">
        {STEPS.map(function(step) {
          var Icon = step.icon;
          var isActive = step.id === currentStep;
          var isCompleted = step.id < currentStep;

          return (
            <div
              key={step.id}
              className={`rounded-[1.5rem] border px-4 py-4 transition ${
                isActive
                  ? "border-blue-600 bg-blue-50"
                  : isCompleted
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
                    isActive
                      ? "bg-blue-600 text-white"
                      : isCompleted
                        ? "bg-emerald-500 text-white"
                        : "bg-slate-100 text-slate-500"
                  }`}
                >
                  <Icon size={18} />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Step {step.id}
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-900">{step.label}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SectionHeading({ title, subtitle }) {
  return (
    <div>
      <h2 className="text-2xl font-black tracking-[-0.04em] text-slate-900">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{subtitle}</p>
    </div>
  );
}

function Field({ label, input, error, help }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-900">{label}</span>
      {input}
      {help ? <span className="mt-2 block text-xs text-slate-500">{help}</span> : null}
      {error ? <span className="mt-2 block text-xs font-semibold text-rose-500">{error}</span> : null}
    </label>
  );
}

function FileDropzone({ label, description, files, onFilesAdded, onRemove }) {
  var inputRef = useRef(null);

  function handleDrop(event) {
    event.preventDefault();
    var droppedFiles = event.dataTransfer && event.dataTransfer.files ? event.dataTransfer.files : [];
    if (droppedFiles.length) onFilesAdded(droppedFiles);
  }

  return (
    <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-slate-50 p-5">
      <div
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
        onClick={() => inputRef.current && inputRef.current.click()}
        className="cursor-pointer rounded-[1.5rem] border border-white bg-white p-6 text-center transition hover:border-blue-200 hover:bg-blue-50/40"
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
          <UploadCloud size={24} />
        </div>
        <h3 className="mt-4 text-lg font-bold text-slate-900">{label}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
        <button
          type="button"
          className="mt-4 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
        >
          Select files
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          onChange={(event) => onFilesAdded(event.target.files || [])}
          className="hidden"
        />
      </div>

      {files.length ? (
        <div className="mt-4 space-y-3">
          {files.map(function(file) {
            return (
              <div
                key={file.id}
                className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-500">
                    <FileCheck2 size={18} />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{file.name}</p>
                    <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(file.id)}
                  className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                >
                  <X size={16} />
                </button>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function Toast({ toast }) {
  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-sm rounded-[1.5rem] border border-slate-200 bg-white px-5 py-4 shadow-[0_20px_40px_rgba(15,23,42,0.12)]">
      <div className="flex items-start gap-3">
        <div
          className={`mt-1 h-3 w-3 rounded-full ${
            toast.type === "success" ? "bg-emerald-500" : "bg-rose-500"
          }`}
        />
        <div>
          <p className="font-bold text-slate-900">{toast.title}</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">{toast.message}</p>
        </div>
      </div>
    </div>
  );
}

function inputClass(error) {
  return `w-full rounded-[1.35rem] border bg-white px-4 py-3 text-base font-medium text-slate-900 outline-none transition ${
    error ? "border-rose-300 bg-rose-50/40" : "border-slate-200"
  } focus:border-blue-600`;
}

function formatFileSize(size) {
  if (!size) return "0 KB";
  if (size > 1024 * 1024) return (size / (1024 * 1024)).toFixed(1) + " MB";
  return Math.max(1, Math.round(size / 1024)) + " KB";
}
