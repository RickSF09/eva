# EvaCares UK GDPR Consent Implementation Guide

**Date:** 18 February 2026
**Author:** Manus AI

## 1. Introduction

This document provides a detailed, actionable guide for redesigning the EvaCares onboarding and consent process to comply with the UK General Data Protection Regulation (UK GDPR). This is a direct follow-up to the main compliance report and addresses your specific questions about the signup checkboxes and the consent call script.

The proposed flow, which separates the carer's administrative setup from the elder's consent for data processing, is a strong, compliant foundation. This guide provides the specific wording and procedural details to build upon that foundation.

## 2. Assessment of Your Proposed Onboarding Flow

Your proposed flow is as follows:

> Carer signs up -> does the onboarding flow (fills all details, sets up schedule and adds billing etc..) -> before we do anything, we call the end user, either manually or automated, we record the call, upon result we update the database with evidence of the consent -> normal AI calls kick-off like normal

**This flow is a significant improvement and is fundamentally compliant with UK GDPR principles.** It correctly identifies that consent must be obtained directly from the end-user (the elder) before the service begins and includes recording the consent call, which is excellent for meeting the accountability principle.

To make it fully robust, this guide refines three key areas:
1.  The carer's declaration at signup.
2.  The script and information provided during the consent call.
3.  The process for handling exceptions and storing evidence.

## 3. Revised Signup Form: The Carer's Declaration

The purpose of the signup form is no longer for the carer to give invalid consent, but to establish the **correct compliance pathway** based on the elder's ability to consent for themselves. The following changes should be implemented in your frontend application.

### Action: Replace the Three Checkboxes

Remove the current three checkboxes. Replace them with a single, mandatory question for the carer during the elder setup process.

**New Carer Declaration (Implementation Text):**

```html
<div class="consent-pathway-selection">
  <p><strong>Please tell us about the person who will be receiving the calls so we can obtain consent correctly.</strong></p>
  
  <label for="can-consent">
    <input type="radio" id="can-consent" name="consent_pathway" value="direct_consent" required>
    My family member is able to understand and provide their own consent.
    <small>We will call them directly to explain the service and ask for their permission before any regular calls begin.</small>
  </label>
  
  <label for="lpa-consent">
    <input type="radio" id="lpa-consent" name="consent_pathway" value="lpa_verification" required>
    My family member is not able to make their own decisions about their care, and I have the legal authority to act on their behalf (e.g., a registered Health and Welfare Lasting Power of Attorney).
    <small>You will be required to provide a copy of the legal documentation for verification before the service can begin.</small>
  </label>
</div>

<div class="terms-agreement">
  <label for="terms">
    <input type="checkbox" id="terms" name="terms_agreed" required>
    I agree to the EvaCares <a href="/terms">Terms of Service</a> and <a href="/privacy">Privacy Policy</a>.
  </label>
</div>
```

**Why this is compliant:**
-   It directly addresses the issue of mental capacity, which is central to valid consent for vulnerable individuals.
-   It creates two distinct, compliant pathways: direct consent or verification of legal authority.
-   It removes the non-compliant checkboxes where the carer was attesting on the elder's behalf.

## 4. The Consent Call: Script and Implementation

This call is the most critical part of the new flow. It must be clear, simple, and unambiguous. It must also capture **explicit consent**, meaning the elder must actively and affirmatively agree to the processing of their health data.

### Onboarding Consent Call Script

This script can be used for an automated call (e.g., via Twilio Studio or your n8n workflows) or a manual call by a human agent.

**Script Text:**

**[Automated Voice/Human Agent]**: "Hello, this is a call from **EvaCares** for **[Elder's First Name]**. Your family member, **[Carer's First Name]**, has set up a new service for you.

> Before we begin, I need to let you know that **this setup call is being recorded** so we have a record of your permissions.
>  
> EvaCares is the service provider processing this information. If you ever want to stop the service or ask questions later, you can tell Eva during a call, tell **[Carer's First Name]**, or contact us at **[Support Phone/Email]**.
>  
> Is it okay to record this setup call?"

> *(System must detect a clear "Yes" or positive affirmation. If "No" or unsure, the call must terminate.)*

> **[Agent]**: "Thank you.

> The service is a daily phone call from our friendly AI assistant, Eva. Eva will call you each day to check in, see how you are, and have a friendly chat.
>  
> To help your family look after you, your calls with Eva will be **recorded and transcribed**. This means we will have a text version of the conversation.
>  
> We use this information to create a summary for your family, which can include details about your health and wellbeing, such as your mood, if you are in any pain, and if you've taken your medication.
>  
> This can include **health information**, and we need your **explicit permission** to process it.
>  
> The service involves:
> 1. Daily recorded phone calls from our AI assistant, Eva.
> 2. Transcribing the conversation and processing it to understand your health and wellbeing.
> 3. Sharing a summary with your family member, **[Carer's First Name]**.
> 4. Following any schedule or checklist your carer sets for these check-ins.
> 5. Storing helpful details you share (like preferences or routines) to make future calls more personal.
>  
> You can ask to stop the service at any time. To stop, you can say: **'Eva, stop the service'**.
>  
> We store recordings and transcripts securely and only share summaries with **[Carer's First Name]** (and any care team they authorise).
>  
> I’m now going to ask for your consent in two parts.

> First: Do you agree to receive these calls and have the calls **recorded and transcribed**? Please say **'Yes, I agree'** or **'No, I do not agree'**."

> *(System must capture a clear, unambiguous 'Yes, I agree'. Anything else, including confusion, silence, or 'No', must be treated as a refusal of consent.)*

> **[If 'Yes, I agree']**: "Thank you.

> Second: Do you agree that EvaCares can use those recordings and transcripts to **process information about your health and wellbeing** (like mood, pain, and medication), and **share a summary** with your family member, **[Carer's First Name]**? Please say **'Yes, I agree'** or **'No, I do not agree'**."

> *(System must capture a clear, unambiguous 'Yes, I agree'. Anything else, including confusion, silence, or 'No', must be treated as a refusal of consent.)*

> **[If 'Yes, I agree']**: "Thank you for your consent. Your EvaCares service is now active. Your first call will be scheduled soon. If you ever want to stop, just say: **'Eva, stop the service'**. Goodbye."

> **[If 'No, I do not agree' or anything else]**: "That's no problem. Thank you for your time. We will not set up the service and will let **[Carer's First Name]** know. Goodbye."

### Information Provided (Compliance Checklist)

This script ensures you provide the following essential information as required by UK GDPR:

| Information Required | Provided in Script? | How |
| :--- | :--- | :--- |
| **Identity of Controller** | Yes | "a call from EvaCares" |
| **Purpose of Processing** | Yes | "to check in... create a summary for your family" |
| **Lawful Basis** | Yes | "we need your explicit permission" |
| **Types of Data** | Yes | "recorded and transcribed... health and wellbeing, such as your mood, pain, medication" |
| **Recipients of Data** | Yes | "Sharing a summary with your family member, [Carer's First Name]" |
| **Right to Withdraw Consent** | Yes | "You can ask to stop the service at any time" |
| **Recording for Evidence** | Yes | "this setup call is being recorded" |

## 5. Database and Backend Implementation

Your backend needs to be updated to store the evidence from this new flow.

**Recommended Schema Changes (add to `elders` table):**

```sql
ALTER TABLE public.elders
ADD COLUMN consent_status TEXT DEFAULT 'pending' NOT NULL, -- e.g., pending, granted, refused, lpa_pending, lpa_verified
ADD COLUMN consent_method TEXT, -- e.g., 'recorded_call', 'lpa_document'
ADD COLUMN consent_evidence_url TEXT, -- URL to the consent call recording or the verified LPA document
ADD COLUMN consent_obtained_at TIMESTAMP WITH TIME ZONE;
```

**Backend Logic:**

1.  When a carer signs up, the `consent_status` for the elder is set to `pending` or `lpa_pending` based on their declaration.
2.  The regular AI call scheduler **must not** initiate calls for any elder whose `consent_status` is not `granted` or `lpa_verified`.
3.  After the consent call:
    *   If consent is granted, update the elder's record: set `consent_status` to `granted`, `consent_method` to `recorded_call`, `consent_obtained_at` to the current timestamp, and `consent_evidence_url` to the URL of the consent call recording.
    *   If consent is refused, set `consent_status` to `refused` and notify the carer.
4.  If the carer chose the LPA path, implement a manual verification step where an admin reviews the uploaded LPA document. If valid, the admin updates the elder's record similarly.

This creates a clear, auditable trail of consent for every user, directly linking to the evidence, which is exactly what the ICO would expect to see for a high-risk processing activity.
