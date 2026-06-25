"use client";

import { useState, useEffect } from "react";
import { updateTenantEmailProvider } from "@/app/actions/tenants";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2 } from "lucide-react";

interface Tenant {
  id: string;
  name: string;
  email_provider: "sendgrid" | "resend";
  email_from_address?: string | null;
}

interface TenantSettingsClientProps {
  initialTenant: Tenant;
}

type MessageType = "success" | "error" | null;

export function TenantSettingsClient({ initialTenant }: TenantSettingsClientProps) {
  const [tenant, setTenant] = useState<Tenant>(initialTenant);
  const [selectedProvider, setSelectedProvider] = useState<"sendgrid" | "resend">(
    initialTenant.email_provider
  );
  const [loading, setLoading] = useState(false);
  const [messageType, setMessageType] = useState<MessageType>(null);
  const [messageText, setMessageText] = useState<string>("");

  const hasChanges = selectedProvider !== tenant.email_provider;

  const handleProviderChange = (provider: "sendgrid" | "resend") => {
    setSelectedProvider(provider);
    setMessageType(null);
  };

  const handleSave = async () => {
    if (!hasChanges) {
      setMessageType("error");
      setMessageText("No changes to save");
      return;
    }

    setLoading(true);
    setMessageType(null);

    try {
      const result = await updateTenantEmailProvider(tenant.id, selectedProvider);

      if (result.success) {
        setTenant({ ...tenant, email_provider: selectedProvider });
        setMessageType("success");
        setMessageText(`Email provider updated to ${selectedProvider}`);
      } else {
        setMessageType("error");
        setMessageText(result.error || "Failed to update email provider");
      }
    } catch (error) {
      setMessageType("error");
      setMessageText(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setSelectedProvider(tenant.email_provider);
    setMessageType(null);
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Tenant Settings</h1>
        <p className="text-gray-600">Manage settings for {tenant.name}</p>
      </div>

      {/* Email Provider Section */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 mb-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Email Provider</h2>
          <p className="text-gray-600 text-sm">
            Select which email service provider to use for sending match alerts to subscribers.
          </p>
        </div>

        {/* Current Provider Display */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2">
            <span className="text-gray-700 font-medium">Current provider:</span>
            <Badge variant="secondary" className="bg-blue-100 text-blue-900 border-blue-300">
              {tenant.email_provider}
            </Badge>
          </div>
        </div>

        {/* Provider Options */}
        <div className="space-y-3 mb-6">
          {/* Sendgrid Option */}
          <label className="flex items-start p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition">
            <input
              type="radio"
              name="email_provider"
              value="sendgrid"
              checked={selectedProvider === "sendgrid"}
              onChange={() => handleProviderChange("sendgrid")}
              className="mt-1 mr-4 w-4 h-4"
            />
            <div className="flex-1">
              <div className="font-medium text-gray-900">Sendgrid</div>
              <div className="text-sm text-gray-600">
                High-volume email delivery with advanced analytics and tracking
              </div>
            </div>
          </label>

          {/* Resend Option */}
          <label className="flex items-start p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition">
            <input
              type="radio"
              name="email_provider"
              value="resend"
              checked={selectedProvider === "resend"}
              onChange={() => handleProviderChange("resend")}
              className="mt-1 mr-4 w-4 h-4"
            />
            <div className="flex-1">
              <div className="font-medium text-gray-900">Resend</div>
              <div className="text-sm text-gray-600">
                Developer-friendly email API with beautiful template support
              </div>
            </div>
          </label>
        </div>

        {/* Message Display */}
        {messageType && (
          <div
            className={`p-4 rounded-lg mb-6 flex items-start gap-3 ${
              messageType === "success"
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {messageType === "success" ? (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            )}
            <span className="text-sm">{messageText}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={handleSave}
            disabled={loading || !hasChanges}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading ? "Saving..." : "Save Changes"}
          </Button>
          {hasChanges && (
            <Button
              onClick={handleCancel}
              variant="outline"
              className="text-gray-700 border-gray-300 hover:bg-gray-50"
            >
              Cancel
            </Button>
          )}
        </div>
      </div>

      {/* Additional Information */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-3">Email Provider Information</h3>
        <div className="space-y-3 text-sm text-gray-700">
          <div>
            <strong>Sendgrid:</strong> Requires SENDGRID_API_KEY environment variable. Ideal for
            high-volume email delivery.
          </div>
          <div>
            <strong>Resend:</strong> Requires RESEND_API_KEY environment variable. Best for
            transactional and marketing emails.
          </div>
          <div className="pt-2 border-t border-gray-300 text-gray-600">
            Make sure your API keys are configured in the environment before switching providers.
          </div>
        </div>
      </div>
    </div>
  );
}
