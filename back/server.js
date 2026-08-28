const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const multer = require('multer');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const { PDFDocument } = require('pdf-lib');

// Microsoft Graph API dependencies
const { ConfidentialClientApplication } = require('@azure/msal-node');
const axios = require('axios');

const app = express();

// Helper function to get current time in MySQL format (Tunisia UTC+1)
function getLocalTime() {
  // Always return Tunisia time (UTC+1) regardless of server timezone
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000); // Get UTC timestamp (add timezone offset to get UTC)
  const tunisiaTime = new Date(utc + 3600000); // Add 1 hour (3600000ms) for UTC+1

  const year = tunisiaTime.getFullYear();
  const month = String(tunisiaTime.getMonth() + 1).padStart(2, '0');
  const day = String(tunisiaTime.getDate()).padStart(2, '0');
  const hours = String(tunisiaTime.getHours()).padStart(2, '0');
  const minutes = String(tunisiaTime.getMinutes()).padStart(2, '0');
  const seconds = String(tunisiaTime.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// Helper function to get current Date object in Tunisia time
function getLocalDate() {
  // Always return Tunisia time (UTC+1) regardless of server timezone
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000); // Get UTC timestamp (add timezone offset to get UTC)
  return new Date(utc + 3600000); // Add 1 hour (3600000ms) for UTC+1
}

// Helper function to strip UTC 'Z' from datetime values returned by mysql2
// so the browser treats them as wall-clock (local) time, not UTC instants.
function stripTimezoneFromDatetime(value) {
  if (!value) return value;
  const s = value instanceof Date ? value.toISOString() : String(value);
  // "2026-03-22T23:59:00.000Z" → "2026-03-22T23:59:00"
  return s.replace(/\.\d{3}Z$/, '').replace(/Z$/, '');
}

// Normalize offer object: strip timezone from datetime fields for client
function normalizeOffer(offer) {
  if (!offer) return offer;
  return {
    ...offer,
    deadline: stripTimezoneFromDatetime(offer.deadline),
    created_at: stripTimezoneFromDatetime(offer.created_at),
    archived_at: stripTimezoneFromDatetime(offer.archived_at),
    answered_at: stripTimezoneFromDatetime(offer.answered_at),
  };
}

// Helper function to convert ISO datetime to MySQL DATETIME format
// Handles both ISO format (2026-05-06T23:00:00.000Z) and already formatted (2026-05-06 23:00:00)
function convertToMySQLDateTime(isoDateTime) {
  if (!isoDateTime) return null;
  if (typeof isoDateTime === 'string' && !isoDateTime.includes('T')) {
    return isoDateTime;
  }
  return isoDateTime.replace('T', ' ').substring(0, 19);
}

const allowedOrigins = [
  'http://10.1.10.182',
  'http://192.168.2.116:91',
  'http://localhost:91',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
  'https://sapmr.oss-online.org:91',
'https://procurement.oss-online.org'
,'https://application.oss-online.org'
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    console.warn('Blocked CORS request from:', origin);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization']
}));

app.use(express.json());


const OUTLOOK_CONFIG = {
    clientId: process.env.OUTLOOK_CLIENT_ID || 'bcec2101-6667-4325-9a01-bc7000eeb704',
    clientSecret: process.env.OUTLOOK_CLIENT_SECRET || 'BIe8Q~.Rj~V.qMYWgo_kZ.D2bucPBPsjTzUi0a3Y',
    tenantId: process.env.OUTLOOK_TENANT_ID || 'c53fcf00-3bfe-4f87-a29e-64232ac2a0d5',
    userEmail: process.env.OUTLOOK_USER_EMAIL || 'plateforme@oss.org.tn'
};

// MSAL Configuration
const clientConfig = {
    auth: {
        clientId: OUTLOOK_CONFIG.clientId,
        clientSecret: OUTLOOK_CONFIG.clientSecret,
        authority: `https://login.microsoftonline.com/${OUTLOOK_CONFIG.tenantId}`
    }
};

const cca = new ConfidentialClientApplication(clientConfig);

// Function to get access token for Microsoft Graph
async function getAccessToken() {
    const clientCredentialRequest = {
        scopes: ['https://graph.microsoft.com/.default'],
    };

    try {
        const response = await cca.acquireTokenByClientCredential(clientCredentialRequest);
        return response.accessToken;
    } catch (error) {
        console.error('Error getting Microsoft Graph access token:', error.message);
        throw error;
    }
}

// Function to get all Comité d'Ouverture users
async function getComiteOuvertureUsers() {
  try {
    const [users] = await pool.query(
      'SELECT id, name, email FROM users WHERE role = ?',
      ['comite_ouverture']
    );
    return users;
  } catch (error) {
    console.error('Error getting Comité d\'Ouverture users:', error);
    return [];
  }
}

// Function to get notification emails for an offer
async function getOfferNotificationEmails(offerId) {
  try {
    const [offers] = await pool.query(
      'SELECT notification_emails FROM offers WHERE id = ?',
      [offerId]
    );

    if (offers.length === 0 || !offers[0].notification_emails) {
      return [];
    }

    const notificationEmails = offers[0].notification_emails;
    let emails = [];

    try {
      // Parse notification emails (could be string or array)
      if (Array.isArray(notificationEmails)) {
        emails = notificationEmails;
      } else if (typeof notificationEmails === 'string') {
        emails = JSON.parse(notificationEmails);
      }

      // Filter out empty emails and validate format
      emails = emails.filter(email => email && email.trim() && email.includes('@'));
    } catch (parseError) {
      console.error('Error parsing notification emails:', parseError);
      return [];
    }

    return emails;
  } catch (error) {
    console.error('Error getting offer notification emails:', error);
    return [];
  }
}

// Create email template for question notification (French)
function createQuestionNotificationEmail(recipientName, offerTitle, questionText) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h2 style="color: #1565c0; margin: 0;">Nouvelle Question Posée</h2>
      </div>

      <div style="padding: 20px; background-color: #ffffff; border: 1px solid #dee2e6; border-radius: 8px;">
        <p style="color: #495057; font-size: 16px;">Bonjour <strong>${recipientName}</strong>,</p>

        <p style="color: #495057; font-size: 14px;">
          Une nouvelle question a été posée concernant l'offre suivante :
        </p>

        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #1565c0;">
          <p style="margin: 5px 0;"><strong>Offre :</strong> ${offerTitle}</p>
          <p style="margin: 5px 0;"><strong>Date :</strong> ${new Date().toLocaleDateString('fr-FR')}</p>
        </div>

        <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 0 0 10px 0; font-weight: bold; color: #856404;">Question posée :</p>
          <p style="margin: 0; color: #495057; font-style: italic;">"${questionText}"</p>
        </div>

        <p style="color: #495057; font-size: 14px;">
          <strong>Actions requises :</strong>
        </p>
        <ul style="color: #495057; font-size: 14px;">
          <li>Veuillez vous connecter au portail pour consulter la question complète</li>
          <li>Répondez à la question si nécessaire</li>
          <li>Les questions sont visibles dans le tableau de bord des offres</li>
        </ul>

        <p style="color: #495057; font-size: 14px;">
          Veuillez vous connecter au portail OSS pour gérer cette question et y répondre si nécessaire.
        </p>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
          <p style="color: #6c757d; font-size: 12px; margin: 0;">
            Ceci est une notification automatique du système de gestion des opportunités OSS.<br>
            Pour toute question technique, veuillez contacter l'administrateur système.
          </p>
        </div>
      </div>
    </div>
  `;
}

// Create email template for question answered notification (English)
function createQuestionAnsweredEmail(questionText, offerTitle) {
    return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h2 style="color: #155724; margin: 0;">Your Question Has Been Answered</h2>
            </div>

            <div style="padding: 20px; background-color: #ffffff; border: 1px solid #dee2e6; border-radius: 8px;">
                <p style="color: #495057; font-size: 16px;">Hello,</p>

                <p style="color: #495057; font-size: 14px;">
                    Your question has been answered concerning the offer below:
                </p>

                <div style="background-color: #e9ecef; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>Offer:</strong> ${offerTitle}</p>
                </div>

                <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p style="margin: 0 0 10px 0; font-weight: bold; color: #856404;">Your question:</p>
                    <p style="margin: 0; color: #495057; font-style: italic;">"${questionText}"</p>
                </div>

                <p style="color: #495057; font-size: 14px;">
                    Please check the platform to view the answer.
                </p>

                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
                    <p style="color: #6c757d; font-size: 12px; margin: 0;">
                        This is an automated notification from the HR Job Portal
                    </p>
                </div>
            </div>
        </div>
    `;
}

// Enhanced email sending function using Microsoft Graph API
async function sendEmailWithGraphAPI(to, subject, htmlContent, textContent = null) {
    try {
        const accessToken = await getAccessToken();

        const emailData = {
            message: {
                subject: subject,
                body: {
                    contentType: 'HTML',
                    content: htmlContent
                },
                from: {
                    emailAddress: {
                        address: OUTLOOK_CONFIG.userEmail,
                        name: "HR Job Portal"
                    }
                },
                toRecipients: [
                    {
                        emailAddress: {
                            address: to
                        }
                    }
                ]
            }
        };

        const response = await axios.post(
            `https://graph.microsoft.com/v1.0/users/${OUTLOOK_CONFIG.userEmail}/sendMail`,
            emailData,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log(`Email sent successfully to ${to}`);
        return response.data;

    } catch (error) {
        console.error('Error sending email via Graph API:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Response data:', JSON.stringify(error.response.data, null, 2));
        }
        throw error;
    }
}

// Create email templates (unchanged)
function createHRNotificationEmail(hrName, offerTitle, applicantName, applicantEmail) {
    return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h2 style="color: #343a40; margin: 0;">New Application Received</h2>
            </div>

            <div style="padding: 20px; background-color: #ffffff; border: 1px solid #dee2e6; border-radius: 8px;">
                <p style="color: #495057; font-size: 16px;">Hello <strong>${hrName}</strong>,</p>

                <p style="color: #495057; font-size: 14px;">
                    You have received a new application for your job offer:
                </p>

                <div style="background-color: #e9ecef; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>Offer:</strong> ${offerTitle}</p>
                    <p style="margin: 5px 0;"><strong>Applicant:</strong> ${applicantName}</p>
                    <p style="margin: 5px 0;"><strong>Email:</strong> ${applicantEmail}</p>
                </div>

                <p style="color: #495057; font-size: 14px;">
                    Please log into the HR portal to review the application and download the submitted documents.
                </p>

                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
                    <p style="color: #6c757d; font-size: 12px; margin: 0;">
                        This is an automated notification from the HR Job Portal
                    </p>
                </div>
            </div>
        </div>
    `;
}

function createApplicantConfirmationEmail(applicantName, offerTitle) {
    return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h2 style="color: #155724; margin: 0;">Application Submitted Successfully</h2>
            </div>

            <div style="padding: 20px; background-color: #ffffff; border: 1px solid #dee2e6; border-radius: 8px;">
                <p style="color: #495057; font-size: 16px;">Dear <strong>${applicantName}</strong>,</p>

                <p style="color: #495057; font-size: 14px;">
                    Thank you for your application! We have successfully received your submission for:
                </p>

                <div style="background-color: #e9ecef; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>Position:</strong> ${offerTitle}</p>
                    <p style="margin: 5px 0;"><strong>Submitted:</strong> ${new Date().toLocaleDateString()}</p>
                </div>

                <p style="color: #495057; font-size: 14px;">
                    Our HR team will review your application and contact you if your profile matches our requirements.
                    This process may take some time, so please be patient.
                </p>

                <p style="color: #495057; font-size: 14px;">
                    <strong>Next Steps:</strong>
                </p>
                <ul style="color: #495057; font-size: 14px;">
                    <li>Your application is now under review</li>
                    <li>We will contact you if you are selected for the next stage</li>
                    <li>Please keep your contact information up to date</li>
                </ul>

                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
                    <p style="color: #6c757d; font-size: 12px; margin: 0;">
                        Best regards,<br>
                        HR Team<br>
                        Job Portal System
                    </p>
                </div>
            </div>
        </div>
    `;
}

function createExpirationNotificationEmail(recipientName, offerTitle, deadline) {
    return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #f8d7da; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h2 style="color: #721c24; margin: 0;">Offer Expired</h2>
            </div>

            <div style="padding: 20px; background-color: #ffffff; border: 1px solid #dee2e6; border-radius: 8px;">
                <p style="color: #495057; font-size: 16px;">Hello <strong>${recipientName}</strong>,</p>

                <p style="color: #495057; font-size: 14px;">
                    Your job offer has reached its deadline and has now expired:
                </p>

                <div style="background-color: #f8d7da; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #dc3545;">
                    <p style="margin: 5px 0;"><strong>Offer:</strong> ${offerTitle}</p>
                    <p style="margin: 5px 0;"><strong>Deadline:</strong> ${deadline}</p>
                    <p style="margin: 5px 0;"><strong>Status:</strong> Expired</p>
                </div>

                <p style="color: #495057; font-size: 14px;">
                    <strong>Recommended Actions:</strong>
                </p>
                <ul style="color: #495057; font-size: 14px;">
                    <li>Review and process any pending applications</li>
                    <li>Close the position if filled</li>
                    <li>Extend the deadline if you need more time</li>
                    <li>Create a new offer if needed</li>
                </ul>

                <p style="color: #495057; font-size: 14px;">
                    Please log into the HR portal to take the necessary actions.
                </p>

                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
                    <p style="color: #6c757d; font-size: 12px; margin: 0;">
                        This is an automated notification from the HR Job Portal
                    </p>
                </div>
            </div>
        </div>
    `;
}

function createFiveDayExpirationNotificationEmail(recipientName, offerTitle, deadline, candidateCount) {
    return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h2 style="color: #1565c0; margin: 0;">Offer Deadline Reminder</h2>
            </div>

            <div style="padding: 20px; background-color: #ffffff; border: 1px solid #dee2e6; border-radius: 8px;">
                <p style="color: #495057; font-size: 16px;">Hello <strong>${recipientName}</strong>,</p>

                <p style="color: #495057; font-size: 14px;">
                    Your job offer is approaching its deadline:
                </p>

                <div style="background-color: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #1565c0;">
                    <p style="margin: 5px 0;"><strong>Offer:</strong> ${offerTitle}</p>
                    <p style="margin: 5px 0;"><strong>Deadline:</strong> ${deadline}</p>
                    <p style="margin: 5px 0;"><strong>Time Remaining:</strong> 5 days</p>
                    <p style="margin: 5px 0;"><strong>Candidates:</strong> ${candidateCount}</p>
                </div>

                <p style="color: #495057; font-size: 14px;">
                    Please log into the HR portal to review your offer and applications.
                </p>

                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
                    <p style="color: #6c757d; font-size: 12px; margin: 0;">
                        This is an automated notification from the HR Job Portal
                    </p>
                </div>
            </div>
        </div>
    `;
}

function createUpcomingExpirationNotificationEmail(recipientName, offerTitle, deadline, daysUntilExpiration) {
    const urgencyColor = daysUntilExpiration === 1 ? '#f8d7da' : '#fff3cd';
    const urgencyTextColor = daysUntilExpiration === 1 ? '#721c24' : '#856404';
    const urgencyBorder = daysUntilExpiration === 1 ? '#dc3545' : '#ffc107';
    const urgencyTitle = daysUntilExpiration === 1 ? 'Offer Expiring Tomorrow' : 'Offer Expiring in 2 Days';

    return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: ${urgencyColor}; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h2 style="color: ${urgencyTextColor}; margin: 0;">${urgencyTitle}</h2>
            </div>

            <div style="padding: 20px; background-color: #ffffff; border: 1px solid #dee2e6; border-radius: 8px;">
                <p style="color: #495057; font-size: 16px;">Hello <strong>${recipientName}</strong>,</p>

                <p style="color: #495057; font-size: 14px;">
                    Your job offer is approaching its deadline:
                </p>

                <div style="background-color: ${urgencyColor}; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid ${urgencyBorder};">
                    <p style="margin: 5px 0;"><strong>Offer:</strong> ${offerTitle}</p>
                    <p style="margin: 5px 0;"><strong>Deadline:</strong> ${deadline}</p>
                    <p style="margin: 5px 0;"><strong>Time Remaining:</strong> ${daysUntilExpiration} day${daysUntilExpiration > 1 ? 's' : ''}</p>
                </div>

                <p style="color: #495057; font-size: 14px;">
                    <strong>Recommended Actions:</strong>
                </p>
                <ul style="color: #495057; font-size: 14px;">
                    <li>Review current applications</li>
                    <li>Extend the deadline if you need more candidates</li>
                    <li>Prepare for application processing when the offer expires</li>
                    <li>Note that you'll have ${daysUntilExpiration === 1 ? '1 day' : '2 days'} after expiration to archive applications</li>
                </ul>

                <p style="color: #495057; font-size: 14px;">
                    Please log into the HR portal to manage your offer and applications.
                </p>

                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
                    <p style="color: #6c757d; font-size: 12px; margin: 0;">
                        This is an automated notification from the HR Job Portal
                    </p>
                </div>
            </div>
        </div>
    `;
}

// Create base directories if they don't exist
const baseFilesDir = path.join(__dirname, 'files');
const tdrDir = path.join(baseFilesDir, 'tdr');
const applicantsDir = path.join(baseFilesDir, 'applicants');
[baseFilesDir, tdrDir, applicantsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Function to sanitize filenames
function sanitizeFilename(name) {
  return name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
}

// Multer setup for TDR files
const tdrStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tdrDir);
  },
  filename: (req, file, cb) => {
    const originalName = file.originalname || 'unknown.pdf';
    const nameWithoutExt = originalName.replace(/\.pdf$/i, '');
    const sanitizedName = sanitizeFilename(nameWithoutExt);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${sanitizedName}-${uniqueSuffix}.pdf`);
  }
});

// Multer setup for applicant files
const applicantStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const offerId = req.body.offer_id;
      if (!offerId) {
        return cb(new Error('offer_id must be provided before applicant files'));
      }

      // Reuse the same lookup for every document in this multipart request.
      if (!req.offerReferencePromise) {
        req.offerReferencePromise = pool.query(
          'SELECT reference FROM offers WHERE id = ?',
          [offerId]
        ).then(([rows]) => {
          if (rows.length === 0) throw new Error('Offer not found');
          return rows[0].reference;
        });
      }

      const offerReference = await req.offerReferencePromise;
      const fullName = req.body.full_name || 'unknown';
      const sanitizedReference = sanitizeFilename(offerReference);
      const sanitizedName = sanitizeFilename(fullName);
      const applicantDir = path.join(applicantsDir, sanitizedReference, sanitizedName);

      // Create the offer and applicant directories if they don't exist.
      if (!fs.existsSync(applicantDir)) {
        fs.mkdirSync(applicantDir, { recursive: true });
      }

      cb(null, applicantDir);
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    const documentType = file.fieldname;
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${documentType}-${uniqueSuffix}.pdf`);
  }
});

const uploadTdr = multer({ storage: tdrStorage });

// Multer setup for bilingual TDR files (French and English)
const uploadTdrBilingual = multer({
  storage: tdrStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});
const MAX_APPLICANT_PDF_SIZE = 15 * 1024 * 1024;
const applicantUploadOptions = {
  storage: applicantStorage,
  limits: {
    fileSize: MAX_APPLICANT_PDF_SIZE
  }
};

const uploadApplicant = multer(applicantUploadOptions);

// Dynamic multer configuration that accepts any field
const uploadApplicantDynamic = multer(applicantUploadOptions);

const handleApplicantUpload = (req, res, next) => {
  uploadApplicantDynamic.any()(req, res, (err) => {
    if (!err) return next();

    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        code: 'FILE_TOO_LARGE',
        error: 'Each PDF must be 15 MB or smaller.'
      });
    }

    console.error('Applicant file upload error:', err);
    return res.status(400).json({ error: 'Failed to upload applicant documents.' });
  });
};
const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'rh_app',
  port: Number(process.env.DB_PORT) || 3306,
  timezone: '+00:00',
};
const JWT_SECRET = 'your_jwt_secret'; // Use env var in production
let pool;

// ───── Initialize DB ─────
(async () => {
  try {
    console.log('Attempting to connect to MySQL...');
    const connection = await mysql.createConnection(DB_CONFIG);
    console.log('Connected to MySQL successfully');

    console.log('Creating database if not exists...');
    await connection.query(`CREATE DATABASE IF NOT EXISTS rh_app`);
    console.log('Database creation query executed');

    await connection.end();
    console.log('Disconnected from initial connection');

    console.log('Creating connection pool with rh_app database...');
    pool = mysql.createPool({ ...DB_CONFIG, database: 'rh_app' });
    console.log('Connection pool created');

    console.log('Creating tables...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('admin', 'comite_ajout', 'comite_ouverture') NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Users table created');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS departments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        created_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id),
        UNIQUE KEY (name, created_by)
      )
    `);
    console.log('Departments table created');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        department_id INT NOT NULL,
        created_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (department_id) REFERENCES departments(id),
        FOREIGN KEY (created_by) REFERENCES users(id),
        UNIQUE KEY (name, department_id, created_by)
      )
    `);
    console.log('Projects table created');



    await pool.query(`
      CREATE TABLE IF NOT EXISTS offers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        type ENUM('travaux', 'fournitures', 'prestation_intellectuelle', 'services', 'offre_d_emploi') NOT NULL,
        method ENUM('appel_d_offres_international', 'appel_d_offres_national', 'appel_d_offres_ouvert', 'appel_d_offres_restreint', 'appel_a_manifestation_d_interet', 'appel_a_candidature', 'consultation_fournisseurs', 'accords_cadres', 'gre_a_gre') NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        country VARCHAR(100) NOT NULL,
        project_id INT NULL,
        reference VARCHAR(255) NOT NULL,
        created_by INT NOT NULL,
        deadline DATETIME NOT NULL,
        status ENUM('actif', 'sous_evaluation', 'resultat', 'infructueux') NOT NULL DEFAULT 'actif',
        winner_name VARCHAR(255) NULL,
        two_day_notified BOOLEAN DEFAULT FALSE,
        one_day_notified BOOLEAN DEFAULT FALSE,
        deadline_notified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        tdr_filename VARCHAR(255) NULL,
        tdr_filepath VARCHAR(255) NULL,
        notification_emails TEXT,
        removed_default_documents TEXT,
        five_day_notified BOOLEAN DEFAULT FALSE,
        language ENUM('fr', 'en', 'both') NOT NULL DEFAULT 'both',
        title_en VARCHAR(255) NULL,
        description_en TEXT NULL,
        tdr_filename_en VARCHAR(255) NULL,
        tdr_filepath_en VARCHAR(255) NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id),
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);
    console.log('Offers table created');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS applications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        offer_id INT NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        tel_number VARCHAR(50) NOT NULL,
        applicant_country VARCHAR(100) NOT NULL,
        cv_filename VARCHAR(255) NULL,
        cv_filepath VARCHAR(255) NULL,
        diplome_filename VARCHAR(255) NULL,
        diplome_filepath VARCHAR(255) NULL,
        id_card_filename VARCHAR(255) NULL,
        id_card_filepath VARCHAR(255) NULL,
        cover_letter_filename VARCHAR(255) NULL,
        cover_letter_filepath VARCHAR(255) NULL,
        declaration_sur_honneur_filename VARCHAR(255) NULL,
        declaration_sur_honneur_filepath VARCHAR(255) NULL,
        fiche_de_referencement_filename VARCHAR(255) NULL,
        fiche_de_referencement_filepath VARCHAR(255) NULL,
        extrait_registre_filename VARCHAR(255) NULL,
        extrait_registre_filepath VARCHAR(255) NULL,
        note_methodologique_filename VARCHAR(255) NULL,
        note_methodologique_filepath VARCHAR(255) NULL,
        liste_references_filename VARCHAR(255) NULL,
        liste_references_filepath VARCHAR(255) NULL,
        offre_financiere_filename VARCHAR(255) NULL,
        offre_financiere_filepath VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        archived_at TIMESTAMP NULL,
        FOREIGN KEY (offer_id) REFERENCES offers(id) ON DELETE CASCADE,
        UNIQUE KEY (offer_id, email)
      )
    `);
    console.log('Applications table created');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS custom_required_documents (
        id INT AUTO_INCREMENT PRIMARY KEY,
        offer_id INT NOT NULL,
        document_name VARCHAR(255) NOT NULL,
        document_name_en VARCHAR(255) NULL,
        document_key VARCHAR(255) NOT NULL,
        required BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (offer_id) REFERENCES offers(id) ON DELETE CASCADE,
        UNIQUE KEY unique_offer_document (offer_id, document_key)
      )
    `);
    console.log('Custom required documents table created');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS applicant_custom_documents (
        id INT AUTO_INCREMENT PRIMARY KEY,
        application_id INT NOT NULL,
        custom_document_id INT NOT NULL,
        document_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(255) NOT NULL,
        file_size INT NOT NULL,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
        FOREIGN KEY (custom_document_id) REFERENCES custom_required_documents(id) ON DELETE CASCADE
      )
    `);
    console.log('Applicant custom documents table created');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS applicant_other_documents (
        id INT AUTO_INCREMENT PRIMARY KEY,
        application_id INT NOT NULL,
        document_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(255) NOT NULL,
        file_size INT NOT NULL,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
      )
    `);
    console.log('Applicant other documents table created');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Logs table created');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS questions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        offer_id INT NOT NULL,
        question TEXT NOT NULL,
        questioner_email VARCHAR(255) NULL,
        answer TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        answered_at TIMESTAMP NULL,
        FOREIGN KEY (offer_id) REFERENCES offers(id) ON DELETE CASCADE
      )
    `);
    console.log('Questions table created');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS ai_rankings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        application_id INT NOT NULL,
        ai_score FLOAT NULL,
        ai_comment TEXT NULL,
        ai_scored_at TIMESTAMP NULL,
        FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
        UNIQUE KEY (application_id)
      )
    `);
    console.log('AI rankings table created');

    console.log('Database and tables initialized successfully.');

    // Schedule daily check for expired offers at midnight
    cron.schedule('0 0 * * *', checkExpiredOffers);
    console.log('Scheduled cron job for checking expired offers');
  } catch (err) {
    console.error('DB Init Error:', err);
  }
})();

function auth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (Array.isArray(role)) {
      if (!role.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
    } else {
      if (req.user.role !== role) return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

function logAction(message) {
  pool.query('INSERT INTO logs (message) VALUES (?)', [message]);
}

function logOfferAction(user, action, offerTitle) {
  const message = `${user.name} (${user.email}) ${action} offer "${offerTitle}"`;
  logAction(message);
}

app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, req.body);
  next();
});

// ───── Auth ─────
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user.id, name: user.name, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '9999999999h' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ───── Users (Admin only) ─────
app.post('/api/users', auth, requireRole('admin'), async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !['admin', 'comite_ajout', 'comite_ouverture'].includes(role)) {
    return res.status(400).json({ error: 'Invalid user data' });
  }
  try {
    const hashed = await bcrypt.hash(password, 10);
    const [result] = await pool.query('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)', [name, email, hashed, role]);
    logAction(`${req.user.name} (${req.user.email}) created user ${name} (${role})`);
    res.json({ id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: 'User creation failed' });
  }
});

app.get('/api/users', auth, requireRole('admin'), async (req, res) => {
  const [users] = await pool.query('SELECT id, name, email, role, created_at FROM users');
  res.json(users);
});

app.put('/api/users/:id', auth, requireRole('admin'), async (req, res) => {
  const { name, email, role } = req.body;
  const { id } = req.params;
  if (!name || !email || !['admin', 'comite_ajout', 'comite_ouverture'].includes(role)) {
    return res.status(400).json({ error: 'Invalid user data' });
  }
  try {
    await pool.query('UPDATE users SET name = ?, email = ?, role = ? WHERE id = ?', [name, email, role, id]);
    logAction(`${req.user.name} (${req.user.email}) updated user ${id}`);
    res.json({ message: 'User updated' });
  } catch {
    res.status(500).json({ error: 'User update failed' });
  }
});

app.delete('/api/users/:id', auth, requireRole('admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    logAction(`${req.user.name} (${req.user.email}) deleted user ${req.params.id}`);
    res.json({ message: 'User deleted' });
  } catch {
    res.status(500).json({ error: 'User delete failed' });
  }
});


// ───── User Profile (Authenticated users) ─────
// Get current user profile
app.get('/api/profile', auth, async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, name, email, role, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(users[0]);
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update password for current user
app.put('/api/profile/password', auth, async (req, res) => {
  try {
    const { current_password, new_password, confirm_password } = req.body;

    // Validate inputs
    if (!current_password || !new_password || !confirm_password) {
      return res.status(400).json({ error: 'All password fields are required' });
    }

    // Check if passwords match
    if (new_password !== confirm_password) {
      return res.status(400).json({ error: 'New passwords do not match' });
    }

    // Validate new password length
    if (new_password.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    // Get user from database
    const [users] = await pool.query('SELECT password FROM users WHERE id = ?', [req.user.id]);

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const user = users[0];
    const isValidPassword = await bcrypt.compare(current_password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(new_password, 10);

    // Update password
    await pool.query(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedPassword, req.user.id]
    );

    logAction(`${req.user.name} (${req.user.email}) updated their password`);

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Update password error:', err);
    res.status(500).json({ error: 'Failed to update password' });
  }
});

app.get('/api/logs', auth, requireRole('admin'), async (req, res) => {
  const [logs] = await pool.query('SELECT * FROM logs ORDER BY created_at DESC');
  res.json(logs);
});

// ───── Departments (comité d'ajout) ─────
app.get('/api/departments', auth, requireRole('comite_ajout'), async (req, res) => {
  try {
    const [departments] = await pool.query(`
      SELECT d.*, u.name as created_by_name
      FROM departments d
      LEFT JOIN users u ON d.created_by = u.id
      WHERE d.created_by IN (SELECT id FROM users WHERE role = 'comite_ajout')
      ORDER BY d.name ASC
    `);
    res.json(departments);
  } catch (err) {
    console.error('Error fetching departments:', err);
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
});

app.post('/api/departments', auth, requireRole('comite_ajout'), async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Department name is required' });

  try {
    const [result] = await pool.query(
      'INSERT INTO departments (name, description, created_by) VALUES (?, ?, ?)',
      [name, '', req.user.id]
    );
    logAction(`${req.user.name} (${req.user.email}) created department "${name}"`);
    res.json({ id: result.insertId, name });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Department with this name already exists' });
    }
    console.error('Error creating department:', err);
    res.status(500).json({ error: 'Failed to create department' });
  }
});

app.put('/api/departments/:id', auth, requireRole('comite_ajout'), async (req, res) => {
  const { name } = req.body;
  const { id } = req.params;

  if (!name) return res.status(400).json({ error: 'Department name is required' });

  try {
    // Verify department belongs to comite_ajout user
    const [deptCheck] = await pool.query(`
      SELECT d.created_by, u.role
      FROM departments d
      LEFT JOIN users u ON d.created_by = u.id
      WHERE d.id = ?
    `, [id]);
    if (deptCheck.length === 0 || deptCheck[0].role !== 'comite_ajout') {
      return res.status(403).json({ error: 'Department not found or access denied' });
    }

    await pool.query('UPDATE departments SET name = ? WHERE id = ?', [name, id]);
    logAction(`${req.user.name} (${req.user.email}) updated department "${name}"`);
    res.json({ message: 'Department updated' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Department with this name already exists' });
    }
    console.error('Error updating department:', err);
    res.status(500).json({ error: 'Failed to update department' });
  }
});

app.delete('/api/departments/:id', auth, requireRole('comite_ajout'), async (req, res) => {
  try {
    // Verify department belongs to comite_ajout user and has no projects
    const [deptCheck] = await pool.query(`
      SELECT d.created_by, u.role
      FROM departments d
      LEFT JOIN users u ON d.created_by = u.id
      WHERE d.id = ?
    `, [req.params.id]);
    if (deptCheck.length === 0 || deptCheck[0].role !== 'comite_ajout') {
      return res.status(403).json({ error: 'Department not found or access denied' });
    }

    const [projectCheck] = await pool.query('SELECT COUNT(*) as count FROM projects WHERE department_id = ?', [req.params.id]);
    if (projectCheck[0].count > 0) {
      return res.status(400).json({ error: 'Cannot delete department with existing projects' });
    }

    await pool.query('DELETE FROM departments WHERE id = ?', [req.params.id]);
    logAction(`${req.user.name} (${req.user.email}) deleted department id ${req.params.id}`);
    res.json({ message: 'Department deleted' });
  } catch (err) {
    console.error('Error deleting department:', err);
    res.status(500).json({ error: 'Failed to delete department' });
  }
});

// ───── Projects (comité d'ajout) ─────
app.get('/api/projects', auth, requireRole('comite_ajout'), async (req, res) => {
  try {
    const [projects] = await pool.query(`
      SELECT p.*, d.name as department_name, u.name as created_by_name
      FROM projects p
      LEFT JOIN departments d ON p.department_id = d.id
      LEFT JOIN users u ON p.created_by = u.id
      WHERE p.created_by IN (SELECT id FROM users WHERE role = 'comite_ajout')
      ORDER BY d.name ASC, p.name ASC
    `);
    res.json(projects);
  } catch (err) {
    console.error('Error fetching projects:', err);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

app.get('/api/projects/department/:departmentId', auth, requireRole('comite_ajout'), async (req, res) => {
  try {
    const { departmentId } = req.params;

    // Verify department belongs to comite_ajout user
    const [deptCheck] = await pool.query(`
      SELECT d.created_by, u.role
      FROM departments d
      LEFT JOIN users u ON d.created_by = u.id
      WHERE d.id = ?
    `, [departmentId]);
    if (deptCheck.length === 0 || deptCheck[0].role !== 'comite_ajout') {
      return res.status(403).json({ error: 'Department not found or access denied' });
    }

    const [projects] = await pool.query(`
      SELECT p.*, d.name as department_name
      FROM projects p
      LEFT JOIN departments d ON p.department_id = d.id
      WHERE p.department_id = ? AND p.created_by IN (SELECT id FROM users WHERE role = 'comite_ajout')
      ORDER BY p.name ASC
    `, [departmentId]);
    res.json(projects);
  } catch (err) {
    console.error('Error fetching projects for department:', err);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

app.post('/api/projects', auth, requireRole('comite_ajout'), async (req, res) => {
  const { name, department_id } = req.body;
  if (!name || !department_id) return res.status(400).json({ error: 'Project name and department are required' });

  try {
    // Verify department belongs to comite_ajout user
    const [deptCheck] = await pool.query(`
      SELECT d.created_by, u.role
      FROM departments d
      LEFT JOIN users u ON d.created_by = u.id
      WHERE d.id = ?
    `, [department_id]);
    if (deptCheck.length === 0 || deptCheck[0].role !== 'comite_ajout') {
      return res.status(403).json({ error: 'Department not found or access denied' });
    }

    const [result] = await pool.query(
      'INSERT INTO projects (name, description, department_id, created_by) VALUES (?, ?, ?, ?)',
      [name, '', department_id, req.user.id]
    );
    logAction(`${req.user.name} (${req.user.email}) created project "${name}"`);
    res.json({ id: result.insertId, name, department_id });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Project with this name already exists in this department' });
    }
    console.error('Error creating project:', err);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

app.put('/api/projects/:id', auth, requireRole('comite_ajout'), async (req, res) => {
  const { name, department_id } = req.body;
  const { id } = req.params;

  if (!name || !department_id) return res.status(400).json({ error: 'Project name and department are required' });

  try {
    // Verify project and department belong to comite_ajout users
    const [projectCheck] = await pool.query(`
      SELECT p.created_by, d.created_by as dept_created_by, u.role as creator_role
      FROM projects p
      LEFT JOIN departments d ON p.department_id = d.id
      LEFT JOIN users u ON p.created_by = u.id
      WHERE p.id = ?
    `, [id]);

    if (projectCheck.length === 0 || projectCheck[0].creator_role !== 'comite_ajout') {
      return res.status(403).json({ error: 'Project not found or access denied' });
    }

    const [deptCheck] = await pool.query(`
      SELECT d.created_by, u.role
      FROM departments d
      LEFT JOIN users u ON d.created_by = u.id
      WHERE d.id = ?
    `, [department_id]);
    if (deptCheck.length === 0 || deptCheck[0].role !== 'comite_ajout') {
      return res.status(403).json({ error: 'Department not found or access denied' });
    }

    await pool.query('UPDATE projects SET name = ?, department_id = ? WHERE id = ?',
      [name, department_id, id]);
    logAction(`${req.user.name} (${req.user.email}) updated project "${name}"`);
    res.json({ message: 'Project updated' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Project with this name already exists in this department' });
    }
    console.error('Error updating project:', err);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

app.delete('/api/projects/:id', auth, requireRole('comite_ajout'), async (req, res) => {
  try {
    // Verify project belongs to comite_ajout user and has no offers
    const [projectCheck] = await pool.query(`
      SELECT p.created_by, u.role
      FROM projects p
      LEFT JOIN users u ON p.created_by = u.id
      WHERE p.id = ?
    `, [req.params.id]);
    if (projectCheck.length === 0 || projectCheck[0].role !== 'comite_ajout') {
      return res.status(403).json({ error: 'Project not found or access denied' });
    }

    const [offerCheck] = await pool.query('SELECT COUNT(*) as count FROM offers WHERE project_id = ?', [req.params.id]);
    if (offerCheck[0].count > 0) {
      return res.status(400).json({ error: 'Impossible de supprimer un projet contenant des offres existantes.' });
    }

    await pool.query('DELETE FROM projects WHERE id = ?', [req.params.id]);
    logAction(`${req.user.name} (${req.user.email}) deleted project id ${req.params.id}`);
    res.json({ message: 'Project deleted' });
  } catch (err) {
    console.error('Error deleting project:', err);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// ───── Offers ─────
// Get all offers with language filtering and tdr url if exists (including expired for frontend filtering)
app.get('/api/offers', async (req, res) => {
  try {
    // Get language from query parameter (default to 'fr')
    const lang = req.query.lang || 'fr';

    // Get current server local time for real-time status checking
    const now = getLocalDate();

    // First, update any expired offers from actif to sous_evaluation
    // Use Tunisia time comparison directly
    await pool.query(`
      UPDATE offers
      SET status = 'sous_evaluation'
      WHERE deadline < ? AND status = 'actif'
    `, [now]);

    // Filter offers by language
    // For 'fr': return offers with language='fr' OR language='both'
    // For 'en': return offers with language='en' OR language='both'
    const languageFilter = lang === 'fr'
      ? "(o.language = 'fr' OR o.language = 'both')"
      : "(o.language = 'en' OR o.language = 'both')";

    // Return appropriate content based on language
    const isEnglish = lang === 'en';

    const [offers] = await pool.query(`
      SELECT o.id, o.type, o.method, o.title, o.title_en, o.description, o.description_en, o.country,
             o.language,
             p.name as project_name, d.name as department_name,
             o.reference, o.deadline, o.created_at,
             o.tdr_filename, o.tdr_filename_en, o.tdr_filepath, o.tdr_filepath_en,
             o.status, o.winner_name, o.removed_default_documents
      FROM offers o
      LEFT JOIN projects p ON o.project_id = p.id
      LEFT JOIN departments d ON p.department_id = d.id
      WHERE ${languageFilter}
      ORDER BY o.created_at DESC
    `);
    const offersWithUrl = offers.map(offer => {
      // Parse removed default documents
      let removedDefaultDocs = [];
      if (offer.removed_default_documents) {
        try {
          removedDefaultDocs = JSON.parse(offer.removed_default_documents);
          if (!Array.isArray(removedDefaultDocs)) {
            removedDefaultDocs = [];
          }
        } catch (e) {
          console.error('Error parsing removed default documents:', e);
          removedDefaultDocs = [];
        }
      }

      return {
        ...offer,
        removed_default_documents: removedDefaultDocs,
        tdr_url: offer.tdr_filename ? `/offers/${offer.id}/tdr` : null
      };
    });
    res.json(offersWithUrl.map(normalizeOffer));
  } catch (err) {
    console.error('Error fetching offers:', err);
    res.status(500).json({ error: 'Failed to fetch offers' });
  }
});

// Get all offers for dashboard (including expired)
app.get('/api/offers/dashboard', auth, requireRole(['comite_ajout', 'comite_ouverture']), async (req, res) => {
  try {
    // Use server local time for consistent comparison
    const now = getLocalDate();

    // First, update any expired offers from actif to sous_evaluation
    // Use Tunisia time comparison directly
    await pool.query(`
      UPDATE offers
      SET status = 'sous_evaluation'
      WHERE deadline < ? AND status = 'actif'
    `, [now]);

    // For comite_ouverture, show all offers. For comite_ajout, show all comite_ajout users' offers.
    const whereClause = req.user.role === 'comite_ouverture' ? '' : 'WHERE u.role = "comite_ajout"';
    const params = req.user.role === 'comite_ouverture' ? [] : [];

    const [offers] = await pool.query(`
      SELECT o.id, o.type, o.method, o.title, o.description, o.country,
             p.name as project_name, d.name as department_name,
             o.reference, o.deadline, o.created_at, o.tdr_filename, o.tdr_filepath,
             o.status, o.winner_name, o.removed_default_documents,
             u.name as created_by_name,
             CASE
               WHEN o.deadline > ? THEN NULL
               WHEN TIMESTAMPDIFF(HOUR, o.deadline, ?) <= 336 THEN 'archive_window_open' -- 14 days = 336 hours
               ELSE 'archive_window_closed'
             END as archive_window_status,
             TIMESTAMPDIFF(HOUR, o.deadline, ?) as hours_since_expiry,
             CASE
               WHEN o.deadline > ? THEN FALSE
               WHEN TIMESTAMPDIFF(HOUR, o.deadline, ?) <= 336 THEN TRUE
               ELSE FALSE
             END as can_archive
      FROM offers o
      LEFT JOIN projects p ON o.project_id = p.id
      LEFT JOIN departments d ON p.department_id = d.id
      LEFT JOIN users u ON o.created_by = u.id
      ${whereClause}
      ORDER BY o.deadline DESC
    `, [now, now, now, now, now, ...params]);

    const offersWithUrl = offers.map(offer => {
      // Parse removed default documents
      let removedDefaultDocs = [];
      if (offer.removed_default_documents) {
        try {
          removedDefaultDocs = JSON.parse(offer.removed_default_documents);
          if (!Array.isArray(removedDefaultDocs)) {
            removedDefaultDocs = [];
          }
        } catch (e) {
          console.error('Error parsing removed default documents:', e);
          removedDefaultDocs = [];
        }
      }

      return {
        ...offer,
        removed_default_documents: removedDefaultDocs,
        tdr_url: offer.tdr_filename ? `/offers/${offer.id}/tdr` : null
      };
    });
    res.json(offersWithUrl.map(normalizeOffer));
  } catch (err) {
    console.error('Error fetching dashboard offers:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard offers' });
  }
});

// Get the next offer reference number for the current year
app.get('/api/offers/next-reference-number', auth, requireRole('comite_ajout'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT COUNT(*) as count FROM offers WHERE YEAR(created_at) = YEAR(CURDATE())`
    );
    const nextNumber = (rows[0].count + 1).toString().padStart(2, '0');
    res.json({ number: nextNumber });
  } catch (err) {
    console.error('Error fetching next reference number:', err);
    res.status(500).json({ error: 'Failed to fetch next reference number' });
  }
});

// Get a single offer by ID
app.get('/api/offers/:id', async (req, res) => {
  try {
    // Get language from query parameter (default to 'fr')
    const lang = req.query.lang || 'fr';

    // Get current server local time for real-time status checking
    const now = getLocalDate();

    // First, update any expired offers from actif to sous_evaluation
    // Use Tunisia time comparison directly
    await pool.query(`
      UPDATE offers
      SET status = 'sous_evaluation'
      WHERE deadline < ? AND status = 'actif'
    `, [now]);

    const [rows] = await pool.query(`
      SELECT o.id, o.type, o.method, o.title, o.title_en, o.description, o.description_en, o.country,
             o.language,
             p.name as project_name, d.name as department_name,
             o.reference, o.deadline, o.created_at,
             o.tdr_filename, o.tdr_filename_en, o.tdr_filepath, o.tdr_filepath_en,
             o.notification_emails, o.project_id, o.status, o.winner_name, o.removed_default_documents
      FROM offers o
      LEFT JOIN projects p ON o.project_id = p.id
      LEFT JOIN departments d ON p.department_id = d.id
      WHERE o.id = ?
    `, [req.params.id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Offer not found' });
    }

    const offer = rows[0];

    // Parse removed default documents
    let removedDefaultDocs = [];
    if (offer.removed_default_documents) {
      try {
        removedDefaultDocs = JSON.parse(offer.removed_default_documents);
        if (!Array.isArray(removedDefaultDocs)) {
          removedDefaultDocs = [];
        }
      } catch (e) {
        console.error('Error parsing removed default documents:', e);
        removedDefaultDocs = [];
      }
    }

    // Get custom required documents for the offer
    const [customDocs] = await pool.query(
      `SELECT id, offer_id, document_name, document_name_en, document_key, required, created_at
       FROM custom_required_documents
       WHERE offer_id = ?`,
      [req.params.id]
    );

    const offerWithUrl = {
      ...offer,
      custom_required_documents: customDocs,
      removed_default_documents: removedDefaultDocs,
      // Return appropriate content based on language
      // If English, use English content if available, otherwise fallback to French
      // If French, always use French content
      title: lang === 'en' ? (offer.title_en || offer.title) : offer.title,
      description: lang === 'en' ? (offer.description_en || offer.description) : offer.description,
      // Select correct TDR file based on language
      tdr_filename: lang === 'en' ? (offer.tdr_filename_en || offer.tdr_filename) : offer.tdr_filename,
      tdr_filepath: lang === 'en' ? (offer.tdr_filepath_en || offer.tdr_filepath) : offer.tdr_filepath,
      // Generate TDR URL based on selected file
      tdr_url: (lang === 'en' ? (offer.tdr_filename_en || offer.tdr_filename) : offer.tdr_filename)
        ? `/offers/${offer.id}/tdr`
        : null
    };

    res.json(normalizeOffer(offerWithUrl));
  } catch (err) {
    console.error('Error fetching offer:', err);
    res.status(500).json({ error: 'Failed to fetch offer' });
  }
});

app.post('/api/offers', auth, requireRole('comite_ajout'), uploadTdrBilingual.fields([{ name: 'tdr', maxCount: 1 }, { name: 'tdr_en', maxCount: 1 }]), async (req, res) => {
  try {
    const { type, method, title, description, country, project_id, reference, deadline, notification_emails, custom_documents, removed_default_documents, language, title_en, description_en } = req.body;
    const tdrFrFile = req.files['tdr'] ? req.files['tdr'][0] : null;
    const tdrEnFile = req.files['tdr_en'] ? req.files['tdr_en'][0] : null;

    // Validate required common fields
    if (!type || !method || !title || !country || !reference || !deadline) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    // Validate language
    if (!language || !['fr', 'en', 'both'].includes(language)) {
      return res.status(400).json({ error: 'Invalid language value. Must be fr, en, or both' });
    }

    // Validate French TDR file
    if (tdrFrFile && tdrFrFile.mimetype !== 'application/pdf') {
      return res.status(400).json({ error: 'French TDR must be a PDF file' });
    }

    // If bilingual, validate English content and TDR
    if (language === 'both') {
      if (!title_en || !description_en) {
        return res.status(400).json({ error: 'English title and description are required for bilingual offers' });
      }
      if (tdrEnFile && tdrEnFile.mimetype !== 'application/pdf') {
        return res.status(400).json({ error: 'English TDR must be a PDF file' });
      }
    }

    // Store TDR files
    const tdrFilenameFr = tdrFrFile ? tdrFrFile.filename : null;
    const tdrFilepathFr = tdrFrFile ? tdrFrFile.path : null;
    const tdrFilenameEn = tdrEnFile ? tdrEnFile.filename : null;
    const tdrFilepathEn = tdrEnFile ? tdrEnFile.path : null;

    // Parse notification emails
    let emails = [];
    if (notification_emails) {
      try {
        emails = JSON.parse(notification_emails);
        // Validate emails (simple validation)
        emails = emails.filter(email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
        // Limit to 10 emails
        emails = emails.slice(0, 10);
      } catch (e) {
        console.error('Error parsing notification emails:', e);
      }
    }

    // Parse removed default documents
    let removedDefaultDocs = [];
    if (removed_default_documents) {
      try {
        removedDefaultDocs = JSON.parse(removed_default_documents);
        if (!Array.isArray(removedDefaultDocs)) {
          removedDefaultDocs = [];
        }
      } catch (e) {
        console.error('Error parsing removed default documents:', e);
        removedDefaultDocs = [];
      }
    }

    const [result] = await pool.query(
      `INSERT INTO offers SET
         type = ?, method = ?, title = ?, description = ?, country = ?, project_id = ?,
         reference = ?, deadline = ?, status = ?, created_by = ?,
         tdr_filename = ?, tdr_filepath = ?, notification_emails = ?, removed_default_documents = ?,
         language = ?, title_en = ?, description_en = ?, tdr_filename_en = ?, tdr_filepath_en = ?
      `,
      [type, method, title, description, country, project_id, reference, convertToMySQLDateTime(deadline), 'actif', req.user.id, tdrFilenameFr, tdrFilepathFr, JSON.stringify(emails), JSON.stringify(removedDefaultDocs), language, title_en, description_en, tdrFilenameEn, tdrFilepathEn]
    );

    const offerId = result.insertId;

    // Handle custom required documents
    if (custom_documents) {
      try {
        const documents = JSON.parse(custom_documents);
        if (Array.isArray(documents) && documents.length > 0) {
          for (const doc of documents) {
            await pool.query(
              `INSERT INTO custom_required_documents (offer_id, document_name, document_name_en, document_key, required)
               VALUES (?, ?, ?, ?, ?)`,
              [offerId, doc.name, doc.name_en?.trim() || null, doc.key, doc.required ? 1 : 0]
            );
          }
        }
      } catch (e) {
        console.error('Error parsing custom documents:', e);
      }
    }

    // Get the complete offer data to return to frontend
    const [newOffer] = await pool.query(
      `SELECT o.*, p.name as project_name, d.name as department_name, u.name as created_by_name, u.email as created_by_email
       FROM offers o
       LEFT JOIN projects p ON o.project_id = p.id
       LEFT JOIN departments d ON p.department_id = d.id
       LEFT JOIN users u ON o.created_by = u.id
       WHERE o.id = ?`,
      [offerId]
    );

    // Get custom required documents for the offer
    const [customDocs] = await pool.query(
      `SELECT id, offer_id, document_name, document_name_en, document_key, required, created_at
       FROM custom_required_documents
       WHERE offer_id = ?`,
      [offerId]
    );

    const offerData = normalizeOffer({ ...newOffer[0], custom_required_documents: customDocs });

    logOfferAction(req.user, 'created', title);
    res.json(offerData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/offers/:id', auth, requireRole('comite_ajout'), uploadTdrBilingual.fields([{ name: 'tdr', maxCount: 1 }, { name: 'tdr_en', maxCount: 1 }]), async (req, res) => {
  try {
    const { type, method, title, title_en, description, description_en, country, project_id, reference, deadline, notification_emails, custom_documents, removed_default_documents, language } = req.body;
    if (!language) {
  return res.status(400).json({ error: 'Language is required' });
}
    const tdrFile = req.files?.tdr?.[0];
    const tdrEnFile = req.files?.tdr_en?.[0];
    const { id } = req.params;

    if (tdrFile && tdrFile.mimetype !== 'application/pdf') {
      return res.status(400).json({ error: 'TDR must be a PDF file' });
    }

    if (tdrEnFile && tdrEnFile.mimetype !== 'application/pdf') {
      return res.status(400).json({ error: 'TDR_EN must be a PDF file' });
    }

    // Verify project belongs to comite_ajout user
    if (project_id) {
      const [projectCheck] = await pool.query(`
        SELECT p.created_by, u.role
        FROM projects p
        LEFT JOIN users u ON p.created_by = u.id
        WHERE p.id = ?
      `, [project_id]);
      if (projectCheck.length === 0 || projectCheck[0].role !== 'comite_ajout') {
        return res.status(403).json({ error: 'Project not found or access denied' });
      }
    }

    // Get existing TDR info to delete old file if replacing
    const [existingOffer] = await pool.query('SELECT tdr_filename, tdr_filepath, tdr_filename_en, tdr_filepath_en FROM offers WHERE id = ?', [id]);
    const oldTdrInfo = existingOffer[0];

    let tdrFilename = oldTdrInfo?.tdr_filename || null;
    let tdrFilepath = oldTdrInfo?.tdr_filepath || null;
    let tdrFilenameEn = oldTdrInfo?.tdr_filename_en || null;
    let tdrFilepathEn = oldTdrInfo?.tdr_filepath_en || null;

    if (tdrFile) {
      tdrFilename = tdrFile.filename;
      tdrFilepath = tdrFile.path;

      // Delete old TDR file if exists
      if (oldTdrInfo?.tdr_filepath && fs.existsSync(oldTdrInfo.tdr_filepath)) {
        fs.unlinkSync(oldTdrInfo.tdr_filepath);
      }
    }

    if (tdrEnFile) {
      tdrFilenameEn = tdrEnFile.filename;
      tdrFilepathEn = tdrEnFile.path;

      // Delete old TDR_EN file if exists
      if (oldTdrInfo?.tdr_filepath_en && fs.existsSync(oldTdrInfo.tdr_filepath_en)) {
        fs.unlinkSync(oldTdrInfo.tdr_filepath_en);
      }
    }

    // Parse notification emails
    let emails = [];
    if (notification_emails) {
      try {
        emails = JSON.parse(notification_emails);
        // Validate emails (simple validation)
        emails = emails.filter(email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
        // Limit to 10 emails
        emails = emails.slice(0, 10);
      } catch (e) {
        console.error('Error parsing notification emails:', e);
      }
    }

    // Parse removed default documents
    let removedDefaultDocs = [];
    if (removed_default_documents) {
      try {
        removedDefaultDocs = JSON.parse(removed_default_documents);
        if (!Array.isArray(removedDefaultDocs)) {
          removedDefaultDocs = [];
        }
      } catch (e) {
        console.error('Error parsing removed default documents:', e);
        removedDefaultDocs = [];
      }
    }

 await pool.query(
  `UPDATE offers SET type = ?, method = ?, title = ?, description = ?, country = ?, project_id = ?, reference = ?, deadline = ?, tdr_filename = ?, tdr_filepath = ?, notification_emails = ?, removed_default_documents = ?, title_en = ?, description_en = ?, tdr_filename_en = ?, tdr_filepath_en = ?, language = ? WHERE id = ?`,
  [type, method, title, description, country, project_id, reference, convertToMySQLDateTime(deadline), tdrFilename, tdrFilepath, JSON.stringify(emails), JSON.stringify(removedDefaultDocs), title_en || null, description_en || null, tdrFilenameEn, tdrFilepathEn, language, id]
);

    // Handle custom required documents - delete existing and recreate
    await pool.query('DELETE FROM custom_required_documents WHERE offer_id = ?', [id]);

    if (custom_documents) {
      try {
        const documents = JSON.parse(custom_documents);
        if (Array.isArray(documents) && documents.length > 0) {
          for (const doc of documents) {
            await pool.query(
              `INSERT INTO custom_required_documents (offer_id, document_name, document_name_en, document_key, required)
               VALUES (?, ?, ?, ?, ?)`,
              [id, doc.name, doc.name_en?.trim() || null, doc.key, doc.required ? 1 : 0]
            );
          }
        }
      } catch (e) {
        console.error('Error parsing custom documents:', e);
      }
    }

    // Get the updated offer data to return to frontend
    const [updatedOffer] = await pool.query(
      `SELECT o.*, p.name as project_name, d.name as department_name, u.name as created_by_name, u.email as created_by_email
       FROM offers o
       LEFT JOIN projects p ON o.project_id = p.id
       LEFT JOIN departments d ON p.department_id = d.id
       LEFT JOIN users u ON o.created_by = u.id
       WHERE o.id = ?`,
      [id]
    );

    // Get custom required documents for the offer
    const [customDocs] = await pool.query(
      `SELECT id, offer_id, document_name, document_name_en, document_key, required, created_at
       FROM custom_required_documents
       WHERE offer_id = ?`,
      [id]
    );

    const offerData = normalizeOffer({ ...updatedOffer[0], custom_required_documents: customDocs });

    logOfferAction(req.user, 'updated', title);
    res.json(offerData);
 } catch (err) {
    console.error('PUT offer error:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

app.delete('/api/offers/:id', auth, requireRole('comite_ajout'), async (req, res) => {
  try {
    const { id } = req.params;

    // Verify offer belongs to comite_ajout user
    const [offerCheck] = await pool.query(`
      SELECT o.tdr_filename, o.tdr_filepath, u.role
      FROM offers o
      LEFT JOIN users u ON o.created_by = u.id
      WHERE o.id = ?
    `, [id]);

    if (offerCheck.length === 0 || offerCheck[0].role !== 'comite_ajout') {
      return res.status(403).json({ error: 'Offer not found or access denied' });
    }

    const tdrInfo = offerCheck[0];

    await pool.query('DELETE FROM offers WHERE id = ?', [id]);

    // Delete TDR file if exists
    if (tdrInfo?.tdr_filepath && fs.existsSync(tdrInfo.tdr_filepath)) {
      fs.unlinkSync(tdrInfo.tdr_filepath);
    }

    logOfferAction(req.user, 'deleted', `offer id ${id}`);
    res.json({ message: 'Offer deleted' });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// Set winner for an offer (change status to 'resultat')
app.post('/api/offers/:id/set-winner', auth, requireRole('comite_ouverture'), async (req, res) => {
  try {
    const { winner_name } = req.body;
    const { id } = req.params;

    if (!winner_name) {
      return res.status(400).json({ error: 'Winner name is required' });
    }

    // Verify offer exists and belongs to user (if comite_ajout)
    const whereClause = req.user.role === 'comite_ouverture'
      ? 'WHERE id = ?'
      : 'WHERE id = ? AND created_by = ?';
    const params = req.user.role === 'comite_ouverture'
      ? [id]
      : [id, req.user.id];

    const [offerCheck] = await pool.query(`SELECT id, title, status FROM offers ${whereClause}`, params);

    if (offerCheck.length === 0) {
      return res.status(404).json({ error: 'Offer not found or access denied' });
    }

    const offer = offerCheck[0];

    // Check if offer is in 'sous_evaluation' status
    if (offer.status !== 'sous_evaluation') {
      return res.status(400).json({ error: 'Offer must be in "sous_evaluation" status to set a winner' });
    }

    // Update offer status and set winner name
    await pool.query(
      'UPDATE offers SET status = ?, winner_name = ? WHERE id = ?',
      ['resultat', winner_name, id]
    );

    logOfferAction(req.user, `set winner for`, `"${offer.title}" - Winner: ${winner_name}`);
    res.json({
      message: `Winner "${winner_name}" has been set for offer "${offer.title}"`,
      winner_name: winner_name,
      status: 'resultat'
    });

  } catch (err) {
    console.error('Error setting winner:', err);
    res.status(500).json({ error: 'Failed to set winner' });
  }
});

// Set offer as infructueux (no applications received)
app.post('/api/offers/:id/set-infructueux', auth, requireRole('comite_ouverture'), async (req, res) => {
  try {
    const { id } = req.params;

    // Verify offer exists and belongs to user (if comite_ajout)
    const whereClause = req.user.role === 'comite_ouverture'
      ? 'WHERE id = ?'
      : 'WHERE id = ? AND created_by = ?';
    const params = req.user.role === 'comite_ouverture'
      ? [id]
      : [id, req.user.id];

    const [offerCheck] = await pool.query(`SELECT id, title, status, deadline FROM offers ${whereClause}`, params);

    if (offerCheck.length === 0) {
      return res.status(404).json({ error: 'Offer not found or access denied' });
    }

    const offer = offerCheck[0];

    // Check if offer is expired (deadline must be in the past)
    const now = getLocalDate();
    if (offer.deadline > now) {
      return res.status(400).json({ error: 'Offer must be expired to mark as infructueux' });
    }

    // Check if offer is in 'sous_evaluation' status
    if (offer.status !== 'sous_evaluation') {
      return res.status(400).json({ error: 'Offer must be in "sous_evaluation" status to mark as infructueux' });
    }

    // Update offer status to infructueux
    await pool.query(
      'UPDATE offers SET status = ? WHERE id = ?',
      ['infructueux', id]
    );

    logOfferAction(req.user, `marked as infructueux`, `"${offer.title}" - No applications received`);
    res.json({
      message: `Offer "${offer.title}" has been marked as infructueux (no applications received)`,
      status: 'infructueux'
    });

  } catch (err) {
    console.error('Error setting infructueux:', err);
    res.status(500).json({ error: 'Failed to mark as infructueux' });
  }
});

// Revert winner for an offer (status 'resultat' -> 'sous_evaluation', clears winner_name)
// Allows the committee to undo a winner selection made by mistake.
// Note: archived applications are NOT restored — they remain as historical records.
app.post('/api/offers/:id/revert-winner', auth, requireRole('comite_ouverture'), async (req, res) => {
  try {
    const { id } = req.params;

    const [offerCheck] = await pool.query('SELECT id, title, status, winner_name FROM offers WHERE id = ?', [id]);

    if (offerCheck.length === 0) {
      return res.status(404).json({ error: 'Offer not found or access denied' });
    }

    const offer = offerCheck[0];

    // Only allow reverting from 'resultat' status
    if (offer.status !== 'resultat') {
      return res.status(400).json({ error: 'Offer must be in "resultat" status to revert the winner' });
    }

    // Reset status to sous_evaluation and clear winner_name
    await pool.query(
      'UPDATE offers SET status = ?, winner_name = NULL WHERE id = ?',
      ['sous_evaluation', id]
    );

    logOfferAction(req.user, `reverted winner for`, `"${offer.title}" - Previous winner: ${offer.winner_name || 'unknown'}`);
    res.json({
      message: `Winner has been reverted for offer "${offer.title}"`,
      status: 'sous_evaluation',
      previous_winner: offer.winner_name
    });

  } catch (err) {
    console.error('Error reverting winner:', err);
    res.status(500).json({ error: 'Failed to revert winner' });
  }
});

// Revert infructueux status for an offer (status 'infructueux' -> 'sous_evaluation')
// Allows the committee to undo an infructueux marking made by mistake.
// Note: archived applications are NOT restored — they remain as historical records.
app.post('/api/offers/:id/revert-infructueux', auth, requireRole('comite_ouverture'), async (req, res) => {
  try {
    const { id } = req.params;

    const [offerCheck] = await pool.query('SELECT id, title, status FROM offers WHERE id = ?', [id]);

    if (offerCheck.length === 0) {
      return res.status(404).json({ error: 'Offer not found or access denied' });
    }

    const offer = offerCheck[0];

    // Only allow reverting from 'infructueux' status
    if (offer.status !== 'infructueux') {
      return res.status(400).json({ error: 'Offer must be in "infructueux" status to revert' });
    }

    // Reset status to sous_evaluation
    await pool.query(
      'UPDATE offers SET status = ? WHERE id = ?',
      ['sous_evaluation', id]
    );

    logOfferAction(req.user, `reverted infructueux status for`, `"${offer.title}"`);
    res.json({
      message: `Offer "${offer.title}" has been reverted from infructueux to sous_evaluation`,
      status: 'sous_evaluation'
    });

  } catch (err) {
    console.error('Error reverting infructueux:', err);
    res.status(500).json({ error: 'Failed to revert infructueux' });
  }
});

// Extend offer deadline
app.post('/api/offers/:id/extend', auth, requireRole('comite_ajout'), async (req, res) => {
  try {
    const { id } = req.params;
    const { new_deadline } = req.body;

    // Validate that new_deadline is provided
    if (!new_deadline) {
      return res.status(400).json({ error: 'New deadline is required' });
    }

    // Parse the new deadline
    const newDeadlineDate = new Date(new_deadline);

    // Validate that it's a valid date
    if (isNaN(newDeadlineDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    // Get current time in Tunisia timezone
    const now = getLocalDate();

    // Validate that new deadline is in the future
    if (newDeadlineDate <= now) {
      return res.status(400).json({ error: 'New deadline must be in the future' });
    }

    // Verify offer exists and is active (any comite_ajout can extend any offer)
    const [offerCheck] = await pool.query(
      'SELECT id, title, status, deadline FROM offers WHERE id = ?',
      [id]
    );

    if (offerCheck.length === 0) {
      return res.status(404).json({ error: 'Offer not found' });
    }

    const offer = offerCheck[0];

    // Check if offer is active
    if (offer.status !== 'actif') {
      return res.status(400).json({ error: 'Only active offers can be extended' });
    }

    // Update the deadline
    await pool.query(
      'UPDATE offers SET deadline = ? WHERE id = ?',
      [convertToMySQLDateTime(new_deadline), id]
    );

    logOfferAction(req.user, `extended deadline`, `"${offer.title}" - Extended from ${offer.deadline} to ${new_deadline}`);

    res.json({
      message: `Offer deadline has been extended`,
      old_deadline: offer.deadline,
      new_deadline: new_deadline,
      offer_id: id
    });

  } catch (err) {
    console.error('Error extending offer deadline:', err);
    res.status(500).json({ error: 'Failed to extend deadline' });
  }
});

app.get('/api/offers/:id/tdr', async (req, res) => {
  try {
    // Get language from query parameter (default to 'fr')
    const lang = req.query.lang || 'fr';

    // Select both French and English TDR files
    const [rows] = await pool.query('SELECT tdr_filename, tdr_filepath, tdr_filename_en, tdr_filepath_en FROM offers WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'TDR not found' });
    }
    const { tdr_filename, tdr_filepath, tdr_filename_en, tdr_filepath_en } = rows[0];

    // Determine which TDR file to return based on language
    let useFrenchTDR = true;
    if (lang === 'en') {
      // For English, prefer English TDR if available, otherwise fall back to French
      if (tdr_filename_en && tdr_filepath_en) {
        useFrenchTDR = false;
      }
    }
    // For French, always use French TDR

    // Select correct TDR file and filename
    const selectedTdrFilename = useFrenchTDR ? tdr_filename : (tdr_filename_en || tdr_filename);
    const selectedTdrFilepath = useFrenchTDR ? tdr_filepath : (tdr_filepath_en || tdr_filepath);

    if (!selectedTdrFilename || !selectedTdrFilepath) {
      return res.status(404).json({ error: `TDR file not found for language: ${lang}` });
    }

    if (!fs.existsSync(selectedTdrFilepath)) {
      return res.status(404).json({ error: 'TDR file not found on disk' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${selectedTdrFilename}"`);
    res.sendFile(selectedTdrFilepath);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// ───── Applications ─────
// ───── Applications ─────
app.post('/api/apply', handleApplicantUpload, async (req, res) => {
  try {
    console.log('Received application submission:', {
      body: req.body,
      filesCount: req.files ? req.files.length : 0,
      files: req.files ? req.files.map(f => ({
        fieldname: f.fieldname,
        originalname: f.originalname,
        mimetype: f.mimetype
      })) : []
    });

    const { offer_id, full_name, email, tel_number, applicant_country } = req.body;
    const files = req.files;

    // Check required fields
    if (!offer_id || !full_name || !email || !tel_number || !applicant_country) {
      console.log('Missing required fields:', { offer_id, full_name, email, tel_number, applicant_country });
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Helper function to get file by fieldname from multer's any() output
    const getFileByFieldname = (fieldName) => {
      if (!files || !Array.isArray(files)) return null;
      return files.find(f => f.fieldname === fieldName);
    };

    // Verify offer exists and get status
    const [offerRows] = await pool.query('SELECT id, title, type, created_by, deadline, status, removed_default_documents FROM offers WHERE id = ?', [offer_id]);
    if (offerRows.length === 0) return res.status(404).json({ error: 'Offer not found' });
    const offer = offerRows[0];

    // Parse removed default documents
    let removedDefaultDocs = [];
    if (offer.removed_default_documents) {
      try {
        removedDefaultDocs = JSON.parse(offer.removed_default_documents);
        if (!Array.isArray(removedDefaultDocs)) {
          removedDefaultDocs = [];
        }
      } catch (e) {
        console.error('Error parsing removed default documents:', e);
        removedDefaultDocs = [];
      }
    }

    // Check required files (filtered by removed documents)
    const requiredFiles = ['cv', 'diplome', 'id_card', 'cover_letter'].filter(field => !removedDefaultDocs.includes(field));
    for (const fieldName of requiredFiles) {
      const file = getFileByFieldname(fieldName);

      if (!file) {
        console.log(`Missing required file: ${fieldName}`);
        console.log('Available fieldnames:', files ? files.map(f => f.fieldname) : []);
        return res.status(400).json({ error: `${fieldName} file is required` });
      }

      if (file.mimetype !== 'application/pdf') {
        console.log(`Invalid file type for ${fieldName}: ${file.mimetype}`);
        return res.status(400).json({ error: `${fieldName} must be a PDF file` });
      }
    }

    // CRITICAL: Check if offer is still active (accepting applications)
    if (offer.status !== 'actif') {
      return res.status(403).json({ error: 'This offer is no longer accepting applications.' });
    }

    // Secondary check: Also verify deadline hasn't passed (backup validation)
    const now = new Date();
    const deadline = new Date(offer.deadline);
    if (now >= deadline) {
      return res.status(403).json({ error: 'Application deadline has passed. No applications are being accepted after the deadline.' });
    }

    // Check if user already applied to this offer
    const [existingApp] = await pool.query('SELECT id FROM applications WHERE offer_id = ? AND email = ?', [offer_id, email]);
    if (existingApp.length > 0) {
      return res.status(400).json({ error: 'You have already applied to this offer' });
    }

    // Check additional required files based on offer method (filtered by removed documents)
    const methodDocMap = {
      'appel_d_offres_international': ['declaration_sur_honneur', 'fiche_de_referencement', 'extrait_registre', 'note_methodologique', 'liste_references', 'offre_financiere'],
      'appel_d_offres_national': ['declaration_sur_honneur', 'fiche_de_referencement', 'extrait_registre', 'note_methodologique', 'liste_references', 'offre_financiere'],
      'appel_d_offres_ouvert': ['declaration_sur_honneur', 'fiche_de_referencement', 'extrait_registre', 'note_methodologique', 'liste_references', 'offre_financiere'],
      'appel_d_offres_restreint': ['declaration_sur_honneur', 'fiche_de_referencement', 'extrait_registre', 'note_methodologique', 'liste_references', 'offre_financiere'],
      'appel_a_manifestation_d_interet': ['declaration_sur_honneur', 'fiche_de_referencement', 'extrait_registre'],
      'appel_a_candidature': ['declaration_sur_honneur', 'fiche_de_referencement', 'extrait_registre'],
      'consultation_fournisseurs': ['offre_financiere'],
      'accords_cadres': ['declaration_sur_honneur', 'fiche_de_referencement', 'extrait_registre', 'offre_financiere'],
      'gre_a_gre': ['declaration_sur_honneur', 'fiche_de_referencement', 'extrait_registre', 'offre_financiere']
    };
    const additionalRequiredFiles = methodDocMap[offer.method] || [];

    // Filter out removed default documents
    const filteredAdditionalFiles = additionalRequiredFiles.filter(field => !removedDefaultDocs.includes(field));

    for (const fieldName of filteredAdditionalFiles) {
      const file = getFileByFieldname(fieldName);
      if (!file) {
        return res.status(400).json({ error: `${fieldName} file is required for this offer type` });
      }
      if (file.mimetype !== 'application/pdf') {
        return res.status(400).json({ error: `${fieldName} must be a PDF file` });
      }
    }

    // Prepare application data with filenames and filepaths (only for files that exist)
    const cvFile = getFileByFieldname('cv');
    const diplomeFile = getFileByFieldname('diplome');
    const idCardFile = getFileByFieldname('id_card');
    const coverLetterFile = getFileByFieldname('cover_letter');

    const applicationData = {
      offer_id,
      full_name,
      email,
      tel_number,
      applicant_country,
      cv_filename: cvFile ? cvFile.originalname : null,
      cv_filepath: cvFile ? cvFile.path : null,
      diplome_filename: diplomeFile ? diplomeFile.originalname : null,
      diplome_filepath: diplomeFile ? diplomeFile.path : null,
      id_card_filename: idCardFile ? idCardFile.originalname : null,
      id_card_filepath: idCardFile ? idCardFile.path : null,
      cover_letter_filename: coverLetterFile ? coverLetterFile.originalname : null,
      cover_letter_filepath: coverLetterFile ? coverLetterFile.path : null,
    };

    // Add additional files if they exist
    const additionalFields = [
      'declaration_sur_honneur', 'fiche_de_referencement', 'extrait_registre',
      'note_methodologique', 'liste_references', 'offre_financiere'
    ];

    for (const fieldName of additionalFields) {
      const file = getFileByFieldname(fieldName);
      // Explicitly set to NULL if file doesn't exist to prevent undefined values
      applicationData[`${fieldName}_filename`] = file ? file.originalname : null;
      applicationData[`${fieldName}_filepath`] = file ? file.path : null;
    }

    // Collect custom documents and other documents
    const customDocuments = [];
    const otherDocuments = [];

    // Build processed fieldnames set based on what's actually required for this offer
    const processedFieldnames = new Set([
      'cv', 'diplome', 'id_card', 'cover_letter',
      'declaration_sur_honneur', 'fiche_de_referencement', 'extrait_registre',
      'note_methodologique', 'liste_references', 'offre_financiere'
    ]);

    // Remove fieldnames that were removed from this offer's requirements
    removedDefaultDocs.forEach(field => processedFieldnames.delete(field));

    if (files && Array.isArray(files)) {
      for (const file of files) {
        // Skip already processed standard files
        if (processedFieldnames.has(file.fieldname)) continue;

        // Check if it's an "other document"
        if (file.fieldname.startsWith('other_doc_')) {
          const index = file.fieldname.replace('other_doc_', '');
          const nameField = `other_doc_name_${index}`;
          const documentName = req.body[nameField] || `Document_${index}`;

          otherDocuments.push({
            name: documentName,
            filename: file.originalname,
            filepath: file.path
          });
        } else {
          // It's a custom document
          customDocuments.push({
            key: file.fieldname,
            filename: file.originalname,
            filepath: file.path
          });
        }
      }
    }

    // Insert application
    const [result] = await pool.query(`
      INSERT INTO applications
      (offer_id, full_name, email, tel_number, applicant_country, cv_filename, cv_filepath,
      diplome_filename, diplome_filepath, id_card_filename, id_card_filepath, cover_letter_filename, cover_letter_filepath,
      declaration_sur_honneur_filename, declaration_sur_honneur_filepath, fiche_de_referencement_filename, fiche_de_referencement_filepath,
      extrait_registre_filename, extrait_registre_filepath, note_methodologique_filename, note_methodologique_filepath,
      liste_references_filename, liste_references_filepath, offre_financiere_filename, offre_financiere_filepath)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        applicationData.offer_id, applicationData.full_name, applicationData.email, applicationData.tel_number,
        applicationData.applicant_country, applicationData.cv_filename, applicationData.cv_filepath,
        applicationData.diplome_filename, applicationData.diplome_filepath, applicationData.id_card_filename, applicationData.id_card_filepath,
        applicationData.cover_letter_filename, applicationData.cover_letter_filepath,
        applicationData.declaration_sur_honneur_filename, applicationData.declaration_sur_honneur_filepath,
        applicationData.fiche_de_referencement_filename, applicationData.fiche_de_referencement_filepath,
        applicationData.extrait_registre_filename, applicationData.extrait_registre_filepath,
        applicationData.note_methodologique_filename, applicationData.note_methodologique_filepath,
        applicationData.liste_references_filename, applicationData.liste_references_filepath,
        applicationData.offre_financiere_filename, applicationData.offre_financiere_filepath
      ]
    );

    const applicationId = result.insertId;

    // Save custom documents to database
    if (customDocuments.length > 0) {
      for (const customDoc of customDocuments) {
        // Get the custom document ID from the custom_required_documents table
        const [customDocRows] = await pool.query(
          'SELECT id FROM custom_required_documents WHERE offer_id = ? AND document_key = ?',
          [offer_id, customDoc.key]
        );

        if (customDocRows.length > 0) {
          const customDocumentId = customDocRows[0].id;
          await pool.query(
            `INSERT INTO applicant_custom_documents (application_id, custom_document_id, document_name, file_path, file_size)
             VALUES (?, ?, ?, ?, ?)`,
            [applicationId, customDocumentId, customDoc.key, customDoc.filepath, 0]
          );
        }
      }
    }

    // Save other documents to database
    if (otherDocuments.length > 0) {
      for (const otherDoc of otherDocuments) {
        await pool.query(
          `INSERT INTO applicant_other_documents (application_id, document_name, file_path, file_size)
           VALUES (?, ?, ?, ?)`,
          [applicationId, otherDoc.name, otherDoc.filepath, 0]
        );
      }
    }

    // Get HR user (offer creator) info and send confirmation email
    const [hrRows] = await pool.query('SELECT name, email FROM users WHERE id = ?', [offer.created_by]);
    if (hrRows.length === 0) {
      console.warn('HR user not found for offer:', offer_id);
    } else {
      try {
        // Send email only to applicant
        await sendEmailWithGraphAPI(
          email,
          `Application Confirmation: ${offer.title}`,
          createApplicantConfirmationEmail(full_name, offer.title)
        );

        console.log('Application confirmation email sent successfully to applicant');
      } catch (emailError) {
        console.error('Error sending application confirmation email:', emailError.message);
        // Application was still saved successfully, just email failed
      }
    }

    console.log(`Application submitted successfully by ${full_name} for offer: ${offer.title}`);
    res.json({ id: applicationId, message: 'Application submitted successfully' });

    // Trigger AI scoring asynchronously (don't await — let it run in background)
    scoreCandidateWithAI(offer_id, applicationId).catch(err => {
      console.error('Background AI scoring failed:', err.message);
    });

  } catch (err) {
    console.error('Application submission error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ───── View Applications ─────
// Get all applications with offer details and document download URLs
app.get('/api/applications', auth, requireRole(['comite_ajout', 'comite_ouverture']), async (req, res) => {
  try {
    // For comite_ouverture, show all applications. For comite_ajout, show all comite_ajout users' applications.
    const whereClause = req.user.role === 'comite_ouverture' ? '' : 'WHERE u.role = "comite_ajout"';
    const params = req.user.role === 'comite_ouverture' ? [] : [];

    const [applications] = await pool.query(`
      SELECT
        a.id,
        a.offer_id,
        o.title AS offer_title,
        o.type AS offer_type,
        d.name AS offer_department,
        a.full_name,
        a.email,
        a.tel_number,
        a.applicant_country,
        a.created_at,
        a.cv_filename, a.cv_filepath,
        a.diplome_filename, a.diplome_filepath,
        a.id_card_filename, a.id_card_filepath,
        a.cover_letter_filename, a.cover_letter_filepath,
        a.declaration_sur_honneur_filename, a.declaration_sur_honneur_filepath,
        a.fiche_de_referencement_filename, a.fiche_de_referencement_filepath,
        a.extrait_registre_filename, a.extrait_registre_filepath,
        a.note_methodologique_filename, a.note_methodologique_filepath,
        a.liste_references_filename, a.liste_references_filepath,
        a.offre_financiere_filename, a.offre_financiere_filepath
      FROM applications a
      JOIN offers o ON a.offer_id = o.id
      LEFT JOIN departments d ON o.department_id = d.id
      LEFT JOIN users u ON o.created_by = u.id
      ${whereClause}
      ORDER BY a.created_at DESC
    `, params);

    // Add document download URLs to each application
    const applicationsWithUrls = applications.map(app => ({
      ...app,
      cv_url: `/applications/${app.id}/cv`,
      diplome_url: `/applications/${app.id}/diplome`,
      id_card_url: `/applications/${app.id}/id_card`,
      cover_letter_url: `/applications/${app.id}/cover_letter`,
      declaration_sur_honneur_url: app.declaration_sur_honneur_filename ? `/applications/${app.id}/declaration_sur_honneur` : null,
      fiche_de_referencement_url: app.fiche_de_referencement_filename ? `/applications/${app.id}/fiche_de_referencement` : null,
      extrait_registre_url: app.extrait_registre_filename ? `/applications/${app.id}/extrait_registre` : null,
      note_methodologique_url: app.note_methodologique_filename ? `/applications/${app.id}/note_methodologique` : null,
      liste_references_url: app.liste_references_filename ? `/applications/${app.id}/liste_references` : null,
      offre_financiere_url: app.offre_financiere_filename ? `/applications/${app.id}/offre_financiere` : null
    }));

    res.json(applicationsWithUrls);
  } catch (err) {
    console.error('Error fetching applications:', err);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// Get application counts by offer (for summary view)
app.get('/api/applications/summary', auth, requireRole(['comite_ajout', 'comite_ouverture']), async (req, res) => {
  try {
    // Use server local time for consistent comparison
    const now = getLocalDate();

    // First, update any expired offers from actif to sous_evaluation
    // Use Tunisia time comparison directly
    await pool.query(`
      UPDATE offers
      SET status = 'sous_evaluation'
      WHERE deadline < ? AND status = 'actif'
    `, [now]);

    // For comite_ouverture, show all offers. For comite_ajout, show all comite_ajout users' offers.
    const whereClause = req.user.role === 'comite_ouverture' ? '' : 'WHERE u.role = "comite_ajout"';
    const params = req.user.role === 'comite_ouverture' ? [] : [];

    const [summary] = await pool.query(`
      SELECT
        o.id as offer_id,
        o.title as offer_title,
        o.type as offer_type,
        d.name as offer_department,
        p.name as offer_project,
        o.deadline,
        COUNT(a.id) as application_count,
        o.status,
        o.winner_name
      FROM offers o
      LEFT JOIN applications a ON o.id = a.offer_id
      LEFT JOIN projects p ON o.project_id = p.id
      LEFT JOIN departments d ON p.department_id = d.id
      LEFT JOIN users u ON o.created_by = u.id
      ${whereClause}
      GROUP BY o.id, o.title, o.type, d.name, p.name, o.deadline, o.status, o.winner_name
      ORDER BY o.deadline ASC
    `, [...params]);

    res.json(summary.map(normalizeOffer));
  } catch (err) {
    console.error('Error fetching application summary:', err);
    res.status(500).json({ error: 'Failed to fetch application summary' });
  }
});

// Archive applications for an expired offer
app.post('/api/applications/archive/:offerId', auth, requireRole(['comite_ajout', 'comite_ouverture']), async (req, res) => {
  try {
    const { offerId } = req.params;

    // Use Tunisia time for consistent comparison
    const now = getLocalDate();

    // For comite_ouverture, verify the offer exists and is expired (any offer)
    // For comite_ajout, verify the offer belongs to comite_ajout users and is expired
    const whereClause = req.user.role === 'comite_ouverture'
      ? 'WHERE id = ? AND deadline <= ?'
      : 'WHERE id = ? AND u.role = "comite_ajout" AND deadline <= ?';
    const params = req.user.role === 'comite_ouverture'
      ? [offerId, now]
      : [offerId, now];

       const [offerCheck] = await pool.query(`
      SELECT o.id, o.title, o.reference, o.deadline
      FROM offers o
      LEFT JOIN users u ON o.created_by = u.id
      WHERE o.id = ? AND deadline <= ?
    `, [offerId, now]);

    if (offerCheck.length === 0) {
      return res.status(404).json({ error: 'Offer not found, not expired, or not authorized' });
    }

    const offer = offerCheck[0];
    const archiveReference = String(offer.reference || offer.id).replace(/[^a-zA-Z0-9_-]/g, '_');

    // Get all applications for this offer (both archived and non-archived)
    const [applications] = await pool.query(`
      SELECT * FROM applications WHERE offer_id = ?
    `, [offerId]);

    if (applications.length === 0) {
      return res.status(404).json({ error: 'No applications found for this offer' });
    }

    // Get only non-archived applications count for logging
    const [nonArchivedApps] = await pool.query(`
      SELECT COUNT(*) as count FROM applications WHERE offer_id = ? AND archived_at IS NULL
    `, [offerId]);

    const nonArchivedCount = nonArchivedApps[0].count;

    // Create a zip file with all applications
    const JSZip = require('jszip');
    const zip = new JSZip();

    for (const app of applications) {
      // Create folder structure: OfferReference/CandidateName/
      const folderName = `${archiveReference}/${app.full_name.replace(/[^a-zA-Z0-9]/g, '_')}`;

      // Add each document if it exists
      const documents = [
        { filename: app.cv_filename, filepath: app.cv_filepath, type: 'CV' },
        { filename: app.diplome_filename, filepath: app.diplome_filepath, type: 'Diploma' },
        { filename: app.id_card_filename, filepath: app.id_card_filepath, type: 'ID_Card' },
        { filename: app.cover_letter_filename, filepath: app.cover_letter_filepath, type: 'Cover_Letter' },
        { filename: app.declaration_sur_honneur_filename, filepath: app.declaration_sur_honneur_filepath, type: 'Declaration_Honneur' },
        { filename: app.fiche_de_referencement_filename, filepath: app.fiche_de_referencement_filepath, type: 'Fiche_Referencement' },
        { filename: app.extrait_registre_filename, filepath: app.extrait_registre_filepath, type: 'Extrait_Registre' },
        { filename: app.note_methodologique_filename, filepath: app.note_methodologique_filepath, type: 'Note_Methodologique' },
        { filename: app.liste_references_filename, filepath: app.liste_references_filepath, type: 'Liste_References' },
        { filename: app.offre_financiere_filename, filepath: app.offre_financiere_filepath, type: 'Offre_Financiere' }
      ];

      for (const doc of documents) {
        if (doc.filename && doc.filepath && fs.existsSync(doc.filepath)) {
          try {
            const fileData = fs.readFileSync(doc.filepath);
            const fileExtension = doc.filename.split('.').pop();
            const cleanFilename = `${doc.type}.${fileExtension}`;
            zip.file(`${folderName}/${cleanFilename}`, fileData);
          } catch (error) {
            console.error(`Error reading ${doc.type} for ${app.full_name}:`, error);
          }
        }
      }

      // Get other documents for this application
      const [otherDocs] = await pool.query(
        'SELECT document_name, file_path FROM applicant_other_documents WHERE application_id = ?',
        [app.id]
      );

      for (const otherDoc of otherDocs) {
        if (otherDoc.file_path && fs.existsSync(otherDoc.file_path)) {
          try {
            const fileData = fs.readFileSync(otherDoc.file_path);
            const fileExtension = otherDoc.file_path.split('.').pop();
            const cleanFilename = `Other_${otherDoc.document_name.replace(/[^a-zA-Z0-9]/g, '_')}.${fileExtension}`;
            zip.file(`${folderName}/${cleanFilename}`, fileData);
          } catch (error) {
            console.error(`Error reading other document ${otherDoc.document_name} for ${app.full_name}:`, error);
          }
        }
      }

      // Get custom documents for this application
      const [customDocs] = await pool.query(
        `SELECT acd.document_name, acd.file_path, crd.document_key
         FROM applicant_custom_documents acd
         JOIN custom_required_documents crd ON acd.custom_document_id = crd.id
         WHERE acd.application_id = ?`,
        [app.id]
      );

      for (const customDoc of customDocs) {
        if (customDoc.file_path && fs.existsSync(customDoc.file_path)) {
          try {
            const fileData = fs.readFileSync(customDoc.file_path);
            const fileExtension = customDoc.file_path.split('.').pop();
            const cleanFilename = `Custom_${customDoc.document_name.replace(/[^a-zA-Z0-9]/g, '_')}.${fileExtension}`;
            zip.file(`${folderName}/${cleanFilename}`, fileData);
          } catch (error) {
            console.error(`Error reading custom document ${customDoc.document_name} for ${app.full_name}:`, error);
          }
        }
      }

      // Add a summary text file for each candidate
      const totalDocs = documents.filter(d => d.filename && d.filepath && fs.existsSync(d.filepath)).length + otherDocs.length + customDocs.length;
      const summaryText = `
Candidate Information:
- Name: ${app.full_name}
- Email: ${app.email}
- Phone: ${app.tel_number}
- Country: ${app.applicant_country}
- Applied for: ${offer.title}
- Offer Type: ${offer.type}
- Department: ${offer.department || 'N/A'}
- Application Date: ${new Date(app.created_at).toLocaleDateString()}
- Total Documents: ${totalDocs}
`;
      zip.file(`${folderName}/candidate_info.txt`, summaryText);
    }

    // Generate the zip file
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    // Create a unique filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5); // Format: YYYY-MM-DDTHH-mm-ss
    const archiveFilename = `archived_applications_${archiveReference}_${timestamp}.zip`;
    const archivePath = `./archives/${archiveFilename}`;

    // Ensure archives directory exists
    if (!fs.existsSync('./archives')) {
      fs.mkdirSync('./archives', { recursive: true });
    }

    // Save the zip file
    fs.writeFileSync(archivePath, zipBuffer);

    // Mark only non-archived applications as archived (leave previously archived ones untouched)
    if (nonArchivedCount > 0) {
      await pool.query('UPDATE applications SET archived_at = NOW() WHERE offer_id = ? AND archived_at IS NULL', [offerId]);
    }

    // Log the action
    logAction(`${req.user.name} (${req.user.email}) archived ${applications.length} applications (${nonArchivedCount} newly archived) for offer "${offer.title}"`);

    res.json({
      message: `Successfully archived ${applications.length} applications for offer "${offer.title}"`,
      archiveFile: archiveFilename,
      applicationsCount: applications.length,
      newlyArchivedCount: nonArchivedCount,
      allowReArchive: nonArchivedCount > 0
    });

  } catch (err) {
    console.error('Error archiving applications:', err);
    res.status(500).json({ error: 'Failed to archive applications' });
  }
});

// Download archived applications file
app.get('/api/applications/archive/:filename', auth, requireRole(['comite_ajout', 'comite_ouverture']), async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = `./archives/${filename}`;

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Archive file not found' });
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.sendFile(path.resolve(filePath));

  } catch (err) {
    console.error('Error downloading archive:', err);
    res.status(500).json({ error: 'Failed to download archive' });
  }
});

// Download documents for a specific application
app.get('/api/applications/:id/:documentType', auth, requireRole(['comite_ajout', 'comite_ouverture']), async (req, res) => {
  try {
    const { id, documentType } = req.params;

    // Validate document type
    const validDocumentTypes = [
      'cv', 'diplome', 'id_card', 'cover_letter',
      'declaration_sur_honneur', 'fiche_de_referencement',
      'extrait_registre', 'note_methodologique',
      'liste_references', 'offre_financiere'
    ];

    if (!validDocumentTypes.includes(documentType)) {
      return res.status(400).json({ error: 'Invalid document type' });
    }

    const [rows] = await pool.query(
      `SELECT ${documentType}_filename, ${documentType}_filepath FROM applications WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) return res.status(404).json({ error: 'Application not found' });

    const filename = rows[0][`${documentType}_filename`];
    const filepath = rows[0][`${documentType}_filepath`];

    if (!filename || !filepath) return res.status(404).json({ error: 'Document not found' });

    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.sendFile(filepath);
  } catch (err) {
    console.error('Error fetching document:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ───── Check for expired offers ─────
async function checkExpiredOffers() {
  try {
    const now = getLocalDate(); // Use Tunisia time
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
    const fiveDaysFromNow = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

    // Format dates for comparison (DATETIME format) - using Tunisia time
    const nowStr = getLocalTime();

    // Check for offers expiring in 5 days (5-day warning) - haven't been notified for 5-day warning
    const [expiringInFiveDaysOffers] = await pool.query(`
      SELECT o.*, u.name as hr_name, u.email as hr_email
      FROM offers o
      JOIN users u ON o.created_by = u.id
      WHERE o.deadline <= ? AND o.deadline > ? AND (o.five_day_notified IS NULL OR o.five_day_notified = FALSE)
    `, [fiveDaysFromNow, twoDaysFromNow]);

    for (const offer of expiringInFiveDaysOffers) {
      try {
        // Get candidate count for this offer
        const [candidateCountResult] = await pool.query(
          'SELECT COUNT(*) as candidate_count FROM applications WHERE offer_id = ?',
          [offer.id]
        );
        const candidateCount = candidateCountResult[0].candidate_count;

        // Send 5-day expiration warning notifications
        let notificationEmails = [];
        if (offer.notification_emails) {
          try {
            notificationEmails = JSON.parse(offer.notification_emails);
          } catch (e) {
            console.error('Error parsing notification emails for offer', offer.id, ':', e.message);
          }
        }

        // Add HR creator email to the notification list if not already included
        if (offer.hr_email && !notificationEmails.includes(offer.hr_email)) {
          notificationEmails.unshift(offer.hr_email); // Add HR email first
        }

        if (notificationEmails.length > 0) {
          for (const email of notificationEmails) {
            try {
              const isHR = email === offer.hr_email;
              const recipientName = isHR ? offer.hr_name : 'Notification Recipient';

              await sendEmailWithGraphAPI(
                email,
                `Offer Deadline Reminder: 5 Days Remaining - ${offer.title}`,
                createFiveDayExpirationNotificationEmail(recipientName, offer.title, offer.deadline, candidateCount)
              );

              const recipientType = isHR ? 'HR creator' : 'notification email';
              logAction(`System sent 5-day expiration warning for offer "${offer.title}" to ${email} (${recipientType})`);
              console.log(`📧 5-day warning email sent to ${email} for offer "${offer.title}" with ${candidateCount} candidates`);
            } catch (emailError) {
              console.error(`Failed to send 5-day warning email to ${email} for offer ${offer.title}:`, emailError.message);
            }
          }
        }
        // Mark as notified for 5-day warning
        await pool.query('UPDATE offers SET five_day_notified = TRUE WHERE id = ?', [offer.id]);

        logAction(`System processed 5-day warning for offer "${offer.title}" with ${notificationEmails.length} notification emails and ${candidateCount} candidates`);

      } catch (error) {
        console.error(`Error processing 5-day warning for offer ${offer.title}:`, error.message);
      }
    }

    // Check for offers expiring in the next 24 hours (1 day warning) - haven't been notified for 1-day warning
    const [expiringTomorrowOffers] = await pool.query(`
      SELECT o.*, u.name as hr_name, u.email as hr_email
      FROM offers o
      JOIN users u ON o.created_by = u.id
      WHERE o.deadline <= ? AND o.deadline > ? AND (o.one_day_notified IS NULL OR o.one_day_notified = FALSE)
    `, [tomorrow, now]);

    for (const offer of expiringTomorrowOffers) {
      try {
        // Send 1-day expiration warning notifications
        let notificationEmails = [];
        if (offer.notification_emails) {
          try {
            notificationEmails = JSON.parse(offer.notification_emails);
          } catch (e) {
            console.error('Error parsing notification emails for offer', offer.id, ':', e.message);
          }
        }

        // Add HR creator email to the notification list if not already included
        if (offer.hr_email && !notificationEmails.includes(offer.hr_email)) {
          notificationEmails.unshift(offer.hr_email); // Add HR email first
        }

        if (notificationEmails.length > 0) {
          for (const email of notificationEmails) {
            try {
              const isHR = email === offer.hr_email;
              const recipientName = isHR ? offer.hr_name : 'Notification Recipient';

              await sendEmailWithGraphAPI(
                email,
                `Offer Expiring Tomorrow: ${offer.title}`,
                createUpcomingExpirationNotificationEmail(recipientName, offer.title, offer.deadline, 1)
              );

              const recipientType = isHR ? 'HR creator' : 'notification email';
              logAction(`System sent 1-day expiration warning for offer "${offer.title}" to ${email} (${recipientType})`);
            } catch (emailError) {
              console.error(`Failed to send 1-day warning email to ${email} for offer ${offer.title}:`, emailError.message);
            }
          }
        }
        // Mark as notified for 1-day warning
        await pool.query('UPDATE offers SET one_day_notified = TRUE WHERE id = ?', [offer.id]);

        logAction(`System processed 1-day warning for offer "${offer.title}" with ${notificationEmails.length} notification emails`);

      } catch (error) {
        console.error(`Error processing 1-day warning for offer ${offer.title}:`, error.message);
      }
    }

    // Check for offers expiring in the next 48 hours (2 day warning) - haven't been notified for 2-day warning
    const [expiringInTwoDaysOffers] = await pool.query(`
      SELECT o.*, u.name as hr_name, u.email as hr_email
      FROM offers o
      JOIN users u ON o.created_by = u.id
      WHERE o.deadline <= ? AND o.deadline > ? AND (o.two_day_notified IS NULL OR o.two_day_notified = FALSE)
    `, [twoDaysFromNow, tomorrow]);

    for (const offer of expiringInTwoDaysOffers) {
      try {
        // Send 2-day expiration warning notifications
        let notificationEmails = [];
        if (offer.notification_emails) {
          try {
            notificationEmails = JSON.parse(offer.notification_emails);
          } catch (e) {
            console.error('Error parsing notification emails for offer', offer.id, ':', e.message);
          }
        }

        // Add HR creator email to the notification list if not already included
        if (offer.hr_email && !notificationEmails.includes(offer.hr_email)) {
          notificationEmails.unshift(offer.hr_email); // Add HR email first
        }

        if (notificationEmails.length > 0) {
          for (const email of notificationEmails) {
            try {
              const isHR = email === offer.hr_email;
              const recipientName = isHR ? offer.hr_name : 'Notification Recipient';

              await sendEmailWithGraphAPI(
                email,
                `Offer Expiring in 2 Days: ${offer.title}`,
                createUpcomingExpirationNotificationEmail(recipientName, offer.title, offer.deadline, 2)
              );

              const recipientType = isHR ? 'HR creator' : 'notification email';
              logAction(`System sent 2-day expiration warning for offer "${offer.title}" to ${email} (${recipientType})`);
            } catch (emailError) {
              console.error(`Failed to send 2-day warning email to ${email} for offer ${offer.title}:`, emailError.message);
            }
          }
        }
        // Mark as notified for 2-day warning
        await pool.query('UPDATE offers SET two_day_notified = TRUE WHERE id = ?', [offer.id]);

        logAction(`System processed 2-day warning for offer "${offer.title}" with ${notificationEmails.length} notification emails`);

      } catch (error) {
        console.error(`Error processing 2-day warning for offer ${offer.title}:`, error.message);
      }
    }

    // Check for already expired offers (post-expiration notification)
    const [expiredOffers] = await pool.query(`
      SELECT o.*, u.name as hr_name, u.email as hr_email
      FROM offers o
      JOIN users u ON o.created_by = u.id
      WHERE o.deadline < ? AND (o.deadline_notified IS NULL OR o.deadline_notified = FALSE)
    `, [now]);

    for (const offer of expiredOffers) {
      try {
        // Send email notifications using the notification_emails field AND HR creator
        let notificationEmails = [];
        if (offer.notification_emails) {
          try {
            notificationEmails = JSON.parse(offer.notification_emails);
          } catch (e) {
            console.error('Error parsing notification emails for offer', offer.id, ':', e.message);
          }
        }

        // Add HR creator email to the notification list if not already included
        if (offer.hr_email && !notificationEmails.includes(offer.hr_email)) {
          notificationEmails.unshift(offer.hr_email); // Add HR email first
        }

        if (notificationEmails.length > 0) {
          for (const email of notificationEmails) {
            try {
              // Personalize the email for HR vs other recipients
              const isHR = email === offer.hr_email;
              const recipientName = isHR ? offer.hr_name : 'Notification Recipient';

              await sendEmailWithGraphAPI(
                email,
                `Offer Expired: ${offer.title}`,
                createExpirationNotificationEmail(recipientName, offer.title, offer.deadline)
              );

              // Log action
              const recipientType = isHR ? 'HR creator' : 'notification email';
              logAction(`System sent expiration notification for offer "${offer.title}" to ${email} (${recipientType})`);
            } catch (emailError) {
              console.error(`Failed to send expiration email to ${email} for offer ${offer.title}:`, emailError.message);
            }
          }
        }
        // Mark as notified
        await pool.query('UPDATE offers SET deadline_notified = TRUE WHERE id = ?', [offer.id]);

        // Log action
        logAction(`System processed expired offer "${offer.title}" with ${notificationEmails.length} notification emails`);

      } catch (error) {
        console.error(`Error processing expired offer ${offer.title}:`, error.message);
      }
    }

    // Update status of expired offers from 'actif' to 'sous_evaluation'
    const [expiredActiveOffers] = await pool.query(`
      SELECT id, title
      FROM offers
      WHERE deadline < ? AND status = 'actif'
    `, [now]);

    for (const offer of expiredActiveOffers) {
      try {
        await pool.query('UPDATE offers SET status = ? WHERE id = ?', ['sous_evaluation', offer.id]);
        logAction(`System automatically changed offer "${offer.title}" status from 'actif' to 'sous_evaluation' due to expired deadline`);
        console.log(`Offer "${offer.title}" (ID: ${offer.id}) status changed to 'sous_evaluation'`);
      } catch (error) {
        console.error(`Error updating status for expired offer ${offer.title}:`, error.message);
      }
    }

    if (expiredActiveOffers.length > 0) {
      console.log(`Updated ${expiredActiveOffers.length} offers from 'actif' to 'sous_evaluation'`);
    }

  } catch (err) {
    console.error('Error checking expired offers:', err);
  }
}

// Test email endpoint for Microsoft Graph API
app.post('/api/test-email', auth, requireRole('admin'), async (req, res) => {
  try {
    const { to, subject, message } = req.body;

    if (!to || !subject || !message) {
      return res.status(400).json({ error: 'Missing required fields: to, subject, message' });
    }

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #343a40; margin: 0;">Test Email</h2>
        </div>

        <div style="padding: 20px; background-color: #ffffff; border: 1px solid #dee2e6; border-radius: 8px;">
          <p style="color: #495057; font-size: 16px;">Hello,</p>

          <p style="color: #495057; font-size: 14px;">
            ${message}
          </p>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
            <p style="color: #6c757d; font-size: 12px; margin: 0;">
              This is a test email sent via Microsoft Graph API<br>
              Sent by: ${req.user.name} (${req.user.email})<br>
              Time: ${new Date().toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    `;

    await sendEmailWithGraphAPI(to, subject, htmlContent);

    logAction(`${req.user.name} (${req.user.email}) sent test email to ${to}`);
    res.json({ message: 'Test email sent successfully via Microsoft Graph API' });

  } catch (err) {
    console.error('Test email error:', err);
    res.status(500).json({ error: 'Failed to send test email: ' + err.message });
  }
});

// ───── Q&A API Endpoints ─────

// Submit a question for an offer
app.post('/api/offers/:id/questions', async (req, res) => {
  try {
    const { id } = req.params;
    const { question, questioner_email } = req.body;

    if (!question || question.trim() === '') {
      return res.status(400).json({ error: 'Question is required' });
    }

    // Validate email format if provided
    if (questioner_email && questioner_email.trim()) {
      const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
      if (!emailRegex.test(questioner_email.trim())) {
        return res.status(400).json({ error: 'Invalid email address' });
      }
    }

    // Check if offer exists and is active
    const [offers] = await pool.query('SELECT status, deadline, title FROM offers WHERE id = ?', [id]);
    if (offers.length === 0) {
      return res.status(404).json({ error: 'Offer not found' });
    }

    const offer = offers[0];

    // Check if offer is still active (not expired and status is 'actif')
    const now = new Date();
    const deadline = new Date(offer.deadline);

    if (offer.status !== 'actif' || deadline < now) {
      return res.status(400).json({ error: 'Questions can only be submitted for active offers' });
    }

    // Insert the question
    const [result] = await pool.query(
      'INSERT INTO questions (offer_id, question, questioner_email) VALUES (?, ?, ?)',
      [id, question.trim(), questioner_email ? questioner_email.trim() : null]
    );

    // Send email notifications to Comité d'Ouverture and notification emails
    try {
      // Get all Comité d'Ouverture users
      const comiteOuvertureUsers = await getComiteOuvertureUsers();

      // Get notification emails for this offer
      const notificationEmails = await getOfferNotificationEmails(id);

      // Combine all recipients and remove duplicates
      const allRecipients = [
        ...comiteOuvertureUsers.map(user => ({ email: user.email, name: user.name, type: 'comite_ouverture' })),
        ...notificationEmails.map(email => ({ email, name: email.split('@')[0], type: 'notification' }))
      ];

      // Remove duplicate emails
      const uniqueRecipients = allRecipients.filter((recipient, index, self) =>
        index === self.findIndex(r => r.email === recipient.email)
      );

      console.log(`Sending question notifications to ${uniqueRecipients.length} recipients for offer ${offer.title}`);

      // Send emails to all recipients
      for (const recipient of uniqueRecipients) {
        try {
          await sendEmailWithGraphAPI(
            recipient.email,
            `Nouvelle question posée - ${offer.title}`,
            createQuestionNotificationEmail(recipient.name, offer.title, question.trim())
          );

          console.log(`Question notification email sent to ${recipient.email} (${recipient.type})`);
          logAction(`System sent question notification for offer "${offer.title}" to ${recipient.email} (${recipient.type})`);
        } catch (emailError) {
          console.error(`Failed to send question notification to ${recipient.email}:`, emailError.message);
          // Continue with other recipients even if one fails
        }
      }

      console.log(`Question notifications sent successfully for offer ${offer.title}`);
    } catch (notificationError) {
      console.error('Error sending question notifications:', notificationError.message);
      // Don't fail the question submission if email sending fails
    }

    res.status(201).json({
      message: 'Question submitted successfully',
      questionId: result.insertId
    });

  } catch (err) {
    console.error('Submit question error:', err);
    res.status(500).json({ error: 'Failed to submit question: ' + err.message });
  }
});

// Get all questions for an offer (for committee)
app.get('/api/offers/:id/questions', auth, requireRole(['comite_ajout', 'comite_ouverture']), async (req, res) => {
  try {
    const { id } = req.params;

    // Get current server local time for real-time status checking
    const now = getLocalDate();

    // First, update any expired offers from actif to sous_evaluation
    // Use Tunisia time comparison directly
    await pool.query(`
      UPDATE offers
      SET status = 'sous_evaluation'
      WHERE deadline < ? AND status = 'actif'
    `, [now]);

    // Check if offer exists
    const [offers] = await pool.query('SELECT status, deadline FROM offers WHERE id = ?', [id]);
    if (offers.length === 0) {
      return res.status(404).json({ error: 'Offer not found' });
    }

    const offer = offers[0];

    // Get all questions for this offer
    const [questions] = await pool.query(
      'SELECT id, question, answer, created_at, answered_at FROM questions WHERE offer_id = ? ORDER BY created_at DESC',
      [id]
    );

    res.json(questions);

  } catch (err) {
    console.error('Get questions error:', err);
    res.status(500).json({ error: 'Failed to get questions: ' + err.message });
  }
});

// Answer a question
app.put('/api/questions/:id/answer', auth, requireRole(['comite_ajout', 'comite_ouverture']), async (req, res) => {
  try {
    const { id } = req.params;
    const { answer } = req.body;

    if (!answer || answer.trim() === '') {
      return res.status(400).json({ error: 'Answer is required' });
    }

    // Get the question and check if the offer is still active
    const [questions] = await pool.query(
      `SELECT q.*, o.status as offer_status, o.deadline, o.title as offer_title
       FROM questions q
       JOIN offers o ON q.offer_id = o.id
       WHERE q.id = ?`,
      [id]
    );

    if (questions.length === 0) {
      return res.status(404).json({ error: 'Question not found' });
    }

    const question = questions[0];

    // Check if offer is still active
    const now = new Date();
    const deadline = new Date(question.deadline);

    if (question.offer_status !== 'actif' || deadline < now) {
      return res.status(400).json({ error: 'Questions can only be answered for active offers' });
    }

    // Update the question with the answer
    await pool.query(
      'UPDATE questions SET answer = ?, answered_at = CURRENT_TIMESTAMP WHERE id = ?',
      [answer.trim(), id]
    );

    // Send email notification to questioner if email is provided
    let emailSent = true;
    let emailError = null;
    if (question.questioner_email) {
      try {
        await sendEmailWithGraphAPI(
          question.questioner_email,
          `Question concerning offer ${question.offer_title}`,
          createQuestionAnsweredEmail(question.question, question.offer_title)
        );
        console.log(`Question answered notification sent to ${question.questioner_email}`);
        logAction(`System sent question answered notification to ${question.questioner_email}`);
      } catch (emailErr) {
        console.error('Failed to send question answered notification:', emailErr.message);
        emailSent = false;
        emailError = emailErr.message;
      }
    }

    // Return success with email status
    if (emailSent) {
      res.json({ message: 'Answer submitted successfully' });
    } else {
      res.json({
        message: 'Answer submitted successfully',
        emailSent: false,
        emailError: 'Email notification failed because address is invalid'
      });
    }

  } catch (err) {
    console.error('Answer question error:', err);
    res.status(500).json({ error: 'Failed to answer question: ' + err.message });
  }
});

// Delete answer for a question
app.delete('/api/questions/:id/answer', auth, requireRole(['comite_ajout', 'comite_ouverture']), async (req, res) => {
  try {
    const { id } = req.params;

    // Get the question and check if it exists and has an answer
    const [questions] = await pool.query(
      `SELECT q.*, o.status as offer_status, o.deadline
       FROM questions q
       JOIN offers o ON q.offer_id = o.id
       WHERE q.id = ? AND answer IS NOT NULL`,
      [id]
    );

    if (questions.length === 0) {
      return res.status(404).json({ error: 'Question with answer not found' });
    }

    const question = questions[0];

    // Check if offer is still active (only allow deletion for active offers)
    const now = new Date();
    const deadline = new Date(question.deadline);

    if (question.offer_status !== 'actif' || deadline < now) {
      return res.status(400).json({ error: 'Answers can only be deleted for active offers' });
    }

    // Delete the answer (set answer and answered_at to NULL)
    await pool.query(
      'UPDATE questions SET answer = NULL, answered_at = NULL WHERE id = ?',
      [id]
    );

    res.json({ message: 'Answer deleted successfully' });

  } catch (err) {
    console.error('Delete answer error:', err);
    res.status(500).json({ error: 'Failed to delete answer: ' + err.message });
  }
});

// Update expired status for a specific offer (called by frontend when timer hits zero)
app.post('/api/offers/:id/update-expired-status', async (req, res) => {
  try {
    const { id } = req.params;
    const now = getLocalDate();

    // First, get the offer details before updating (for email notification)
    const [offerRows] = await pool.query(`
      SELECT o.*, u.name as hr_name, u.email as hr_email
      FROM offers o
      JOIN users u ON o.created_by = u.id
      WHERE o.id = ? AND o.deadline < ? AND o.status = 'actif'
    `, [id, now]);

    if (offerRows.length === 0) {
      return res.json({
        success: true,
        message: 'No update needed - offer not expired or already updated'
      });
    }

    const offer = offerRows[0];

    // Update the offer status
    await pool.query(`
      UPDATE offers
      SET status = 'sous_evaluation'
      WHERE id = ? AND deadline < ? AND status = 'actif'
    `, [id, now]);

    // Send expiration email immediately
    try {
      let notificationEmails = [];
      if (offer.notification_emails) {
        try {
          notificationEmails = JSON.parse(offer.notification_emails);
        } catch (e) {
          console.error('Error parsing notification emails for offer', offer.id, ':', e.message);
        }
      }

      // Add HR creator email to the notification list if not already included
      if (offer.hr_email && !notificationEmails.includes(offer.hr_email)) {
        notificationEmails.unshift(offer.hr_email); // Add HR email first
      }

      if (notificationEmails.length > 0) {
        for (const email of notificationEmails) {
          try {
            // Personalize the email for HR vs other recipients
            const isHR = email === offer.hr_email;
            const recipientName = isHR ? offer.hr_name : 'Notification Recipient';

            await sendEmailWithGraphAPI(
              email,
              `Offer Expired: ${offer.title}`,
              createExpirationNotificationEmail(recipientName, offer.title, offer.deadline)
            );

            // Log action
            const recipientType = isHR ? 'HR creator' : 'notification email';
            logAction(`System sent immediate expiration notification for offer "${offer.title}" to ${email} (${recipientType})`);
            console.log(`📧 Immediate expiration email sent to ${email} for offer "${offer.title}"`);
          } catch (emailError) {
            console.error(`Failed to send immediate expiration email to ${email} for offer ${offer.title}:`, emailError.message);
          }
        }
      }

      // Mark as notified to prevent duplicate emails from cron job
      await pool.query('UPDATE offers SET deadline_notified = TRUE WHERE id = ?', [id]);

      // Log action
      logAction(`System processed immediate expiration for offer "${offer.title}" with ${notificationEmails.length} notification emails`);

    } catch (emailError) {
      console.error('Error sending immediate expiration email:', emailError);
      // Don't fail the status update if email fails
    }

    logAction(`System automatically changed offer "${offer.title}" status from 'actif' to 'sous_evaluation' due to expired deadline (immediate trigger)`);
    console.log(`⚡ Offer "${offer.title}" (ID: ${id}) status changed to 'sous_evaluation' and expiration email sent immediatelyy`);

    res.json({
      success: true,
      message: 'Status updated and expiration notification sent',
      emailSent: true,
      updated: true
    });

  } catch (err) {
    console.error('Error in immediate expiration update:', err);
    res.status(500).json({ error: 'Failed to update status: ' + err.message });
  }
});

// Get FAQ (answered questions) for an offer
app.get('/api/offers/:id/faq', async (req, res) => {
  try {
    const { id } = req.params;

    // Get current server local time for real-time status checking
    const now = getLocalDate();

    // First, update any expired offers from actif to sous_evaluation
    // Use Tunisia time comparison directly
    await pool.query(`
      UPDATE offers
      SET status = 'sous_evaluation'
      WHERE deadline < ? AND status = 'actif'
    `, [now]);

    // Check if offer exists
    const [offers] = await pool.query('SELECT id FROM offers WHERE id = ?', [id]);
    if (offers.length === 0) {
      return res.status(404).json({ error: 'Offer not found' });
    }

    // Get answered questions for this offer
    const [questions] = await pool.query(
      'SELECT question, answer FROM questions WHERE offer_id = ? AND answer IS NOT NULL ORDER BY answered_at DESC',
      [id]
    );

    res.json(questions);

  } catch (err) {
    console.error('Get FAQ error:', err);
    res.status(500).json({ error: 'Failed to get FAQ: ' + err.message });
  }
});

// Statistics endpoint for Comité d'Ouverture
app.get('/api/statistics', auth, requireRole(['admin', 'comite_ajout', 'comite_ouverture']), async (req, res) => {
  try {
    // Overview Statistics
    const [offerStats] = await pool.query(`
      SELECT
        COUNT(*) as total_offers,
        COUNT(CASE WHEN status = 'actif' THEN 1 END) as active_offers,
        COUNT(CASE WHEN status = 'sous_evaluation' THEN 1 END) as evaluation_offers,
        COUNT(CASE WHEN status = 'resultat' THEN 1 END) as result_offers,
        COUNT(CASE WHEN status = 'infructueux' THEN 1 END) as infructueux_offers,
        COUNT(CASE WHEN deadline > NOW() THEN 1 END) as not_expired
      FROM offers
    `);

    const [applicationStats] = await pool.query(`
      SELECT
        COUNT(*) as total_applications,
        COUNT(DISTINCT offer_id) as offers_with_applications,
        (SELECT COUNT(*) FROM applications WHERE DATE(created_at) = DATE(NOW())) as applications_today,
        (SELECT COUNT(*) FROM applications WHERE MONTH(created_at) = MONTH(NOW()) AND YEAR(created_at) = YEAR(NOW())) as applications_this_month
      FROM applications
    `);

    // Geographic Statistics
    const [countryStats] = await pool.query(`
      SELECT
        applicant_country as country,
        COUNT(*) as application_count
      FROM applications
      GROUP BY applicant_country
      ORDER BY application_count DESC
      LIMIT 10
    `);

    const [offerCountryStats] = await pool.query(`
      SELECT
        country,
        COUNT(*) as offer_count
      FROM offers
      GROUP BY country
      ORDER BY offer_count DESC
      LIMIT 10
    `);

    // Offer Type Performance
    const [typeStats] = await pool.query(`
      SELECT
        o.type,
        COUNT(o.id) as offer_count,
        COALESCE(AVG(app_counts.application_count), 0) as avg_applications,
        COUNT(a.id) as total_applications
      FROM offers o
      LEFT JOIN (
        SELECT offer_id, COUNT(*) as application_count
        FROM applications
        GROUP BY offer_id
      ) app_counts ON o.id = app_counts.offer_id
      LEFT JOIN applications a ON o.id = a.offer_id
      GROUP BY o.type
      ORDER BY total_applications DESC
    `);

    // Department Performance
    const [departmentStats] = await pool.query(`
      SELECT
        d.name as department_name,
        COUNT(o.id) as offer_count,
        COUNT(a.id) as total_applications,
        COALESCE(AVG(app_counts.application_count), 0) as avg_applications_per_offer
      FROM departments d
      LEFT JOIN projects p ON d.id = p.department_id
      LEFT JOIN offers o ON p.id = o.project_id
      LEFT JOIN applications a ON o.id = a.offer_id
      LEFT JOIN (
        SELECT offer_id, COUNT(*) as application_count
        FROM applications
        GROUP BY offer_id
      ) app_counts ON o.id = app_counts.offer_id
      GROUP BY d.id, d.name
      HAVING offer_count > 0
      ORDER BY total_applications DESC
      LIMIT 10
    `);

    // Monthly Trends (last 12 months)
    const [monthlyTrends] = await pool.query(`
      SELECT
        DATE_FORMAT(created_at, '%Y-%m') as month,
        COUNT(*) as application_count
      FROM applications
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
      GROUP BY DATE_FORMAT(created_at, '%Y-%m')
      ORDER BY month ASC
    `);

    const [monthlyOfferTrends] = await pool.query(`
      SELECT
        DATE_FORMAT(created_at, '%Y-%m') as month,
        COUNT(*) as offer_count
      FROM offers
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
      GROUP BY DATE_FORMAT(created_at, '%Y-%m')
      ORDER BY month ASC
    `);

    // Process Metrics - FIXED VERSION
    const [processMetrics] = await pool.query(`
      SELECT
        COUNT(CASE WHEN a.archived_at IS NOT NULL THEN 1 END) as archived_applications,
        COUNT(*) as total_expired_applications,
        (SELECT COUNT(CASE WHEN answer IS NOT NULL THEN 1 END) FROM questions) as answered_questions,
        (SELECT COUNT(*) FROM questions) as total_questions
      FROM applications a
      LEFT JOIN offers o ON a.offer_id = o.id
      WHERE o.deadline < NOW()
    `);

    // Top Offers by Applications
    const [topOffers] = await pool.query(`
      SELECT
        o.id,
        o.title,
        o.type,
        d.name as department_name,
        COUNT(a.id) as application_count
      FROM offers o
      LEFT JOIN projects p ON o.project_id = p.id
      LEFT JOIN departments d ON p.department_id = d.id
      LEFT JOIN applications a ON o.id = a.offer_id
      GROUP BY o.id, o.title, o.type, d.name
      ORDER BY application_count DESC
      LIMIT 10
    `);

    // User Activity
    const [userActivity] = await pool.query(`
      SELECT
        u.name,
        u.role,
        COUNT(o.id) as offers_created,
        COUNT(DISTINCT a.id) as applications_processed
      FROM users u
      LEFT JOIN offers o ON u.id = o.created_by
      LEFT JOIN applications a ON o.id = a.offer_id
      GROUP BY u.id, u.name, u.role
      ORDER BY offers_created DESC, applications_processed DESC
    `);

    // Calculate derived metrics
    const stats = {
      overview: {
        ...offerStats[0],
        ...applicationStats[0],
        success_rate: applicationStats[0].offers_with_applications > 0
          ? ((applicationStats[0].offers_with_applications / offerStats[0].total_offers) * 100).toFixed(1)
          : 0,
        avg_applications_per_offer: offerStats[0].total_offers > 0
          ? (applicationStats[0].total_applications / offerStats[0].total_offers).toFixed(1)
          : 0
      },
      geographic: {
        top_applicant_countries: countryStats,
        offer_distribution: offerCountryStats
      },
      performance: {
        by_type: typeStats,
        by_department: departmentStats,
        top_offers: topOffers
      },
      trends: {
        monthly_applications: monthlyTrends,
        monthly_offers: monthlyOfferTrends
      },
      process: {
        ...processMetrics[0],
        archive_completion_rate: processMetrics[0].total_expired_applications > 0
          ? ((processMetrics[0].archived_applications / processMetrics[0].total_expired_applications) * 100).toFixed(1)
          : 0,
        question_response_rate: processMetrics[0].total_questions > 0
          ? ((processMetrics[0].answered_questions / processMetrics[0].total_questions) * 100).toFixed(1)
          : 0
      },
      user_activity: userActivity,
      timestamp: new Date().toISOString()
    };

    res.json(stats);
  } catch (error) {
    console.error('Statistics API error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});
// ───── Start Server ─────
// ───── AI Ranking ─────

// OpenRouter configuration
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash-lite';
const MAX_AI_PAGES_PER_DOCUMENT = 5;

// Helper: extract text from a PDF file
async function extractPdfText(filePath) {
  try {
    if (!filePath || !fs.existsSync(filePath)) return '';
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text || '';
  } catch (err) {
    console.error('Error extracting PDF text:', filePath, err.message);
    return '';
  }
}

// Create an OpenRouter file input containing at most the first five pages.
// The original applicant document is never modified.
async function createLimitedPdfInput(filePath, documentName) {
  if (!filePath || !fs.existsSync(filePath)) return null;

  const originalBytes = await fs.promises.readFile(filePath);
  const originalPdf = await PDFDocument.load(originalBytes);
  const originalPageCount = originalPdf.getPageCount();
  const analyzedPageCount = Math.min(MAX_AI_PAGES_PER_DOCUMENT, originalPageCount);

  if (analyzedPageCount === 0) return null;

  const limitedPdf = await PDFDocument.create();
  const pageIndexes = Array.from({ length: analyzedPageCount }, (_, index) => index);
  const copiedPages = await limitedPdf.copyPages(originalPdf, pageIndexes);
  copiedPages.forEach(page => limitedPdf.addPage(page));

  const limitedBytes = await limitedPdf.save();
  const safeDocumentName = sanitizeFilename(documentName || path.basename(filePath)) || 'document';

  return {
    documentName,
    originalPageCount,
    analyzedPageCount,
    content: {
      type: 'file',
      file: {
        filename: `${safeDocumentName}-first-${analyzedPageCount}-pages.pdf`,
        file_data: `data:application/pdf;base64,${Buffer.from(limitedBytes).toString('base64')}`
      }
    }
  };
}

// Score a single candidate against an offer using OpenRouter
async function scoreCandidateWithAI(offerId, applicationId) {
  try {
    if (!OPENROUTER_API_KEY) {
      console.warn('OPENROUTER_API_KEY not set, skipping AI scoring');
      return;
    }

    // 1. Get offer details + TDR text
    const [offerRows] = await pool.query(
      'SELECT id, title, description, type, method, reference, tdr_filepath, tdr_filepath_en FROM offers WHERE id = ?',
      [offerId]
    );
    if (offerRows.length === 0) return;
    const offer = offerRows[0];

    const tdrPath = offer.tdr_filepath || offer.tdr_filepath_en;
    const tdrText = await extractPdfText(tdrPath);

    // 2. Get application details + all document texts
    const [appRows] = await pool.query(
      `SELECT id, full_name, email, applicant_country,
        cv_filepath, diplome_filepath, id_card_filepath, cover_letter_filepath,
        declaration_sur_honneur_filepath, fiche_de_referencement_filepath,
        extrait_registre_filepath, note_methodologique_filepath,
        liste_references_filepath, offre_financiere_filepath
       FROM applications WHERE id = ?`,
      [applicationId]
    );
    if (appRows.length === 0) return;
    const application = appRows[0];

    // Collect every standard application document. Custom and other documents
    // are appended below so the list remains dynamic.
    const candidateDocuments = [
      { key: 'CV', path: application.cv_filepath },
      { key: 'Diploma', path: application.diplome_filepath },
      { key: 'ID Card', path: application.id_card_filepath },
      { key: 'Cover Letter', path: application.cover_letter_filepath },
      { key: 'Declaration sur honneur', path: application.declaration_sur_honneur_filepath },
      { key: 'Fiche de referencement', path: application.fiche_de_referencement_filepath },
      { key: 'Extrait registre', path: application.extrait_registre_filepath },
      { key: 'Note methodologique', path: application.note_methodologique_filepath },
      { key: 'Liste references', path: application.liste_references_filepath },
      { key: 'Offre financiere', path: application.offre_financiere_filepath },
    ];

    // Also get custom documents
    const [customDocs] = await pool.query(
      `SELECT acd.document_name, acd.file_path
       FROM applicant_custom_documents acd
       WHERE acd.application_id = ?`,
      [applicationId]
    );

    // And other documents
    const [otherDocs] = await pool.query(
      `SELECT document_name, file_path
       FROM applicant_other_documents
       WHERE application_id = ?`,
      [applicationId]
    );

    for (const doc of customDocs) {
      candidateDocuments.push({ key: doc.document_name, path: doc.file_path });
    }

    for (const doc of otherDocs) {
      candidateDocuments.push({ key: doc.document_name, path: doc.file_path });
    }

    const preparedDocuments = [];
    const skippedDocuments = [];

    for (const doc of candidateDocuments) {
      if (!doc.path) continue;

      try {
        const preparedDocument = await createLimitedPdfInput(doc.path, doc.key);
        if (preparedDocument) {
          preparedDocuments.push(preparedDocument);
        } else {
          skippedDocuments.push(`${doc.key} (empty or missing)`);
        }
      } catch (err) {
        skippedDocuments.push(`${doc.key} (could not be opened)`);
        console.error(`Could not prepare ${doc.key} for AI scoring:`, err.message);
      }
    }

    if (preparedDocuments.length === 0) {
      console.warn(`No applicant documents could be prepared for application ${applicationId}`);
      return;
    }

    // 3. Build prompt
    const offerContext = `Offer Title: ${offer.title}
${tdrText ? `TDR (Terms of Reference):\n${tdrText}` : 'No TDR document available.'}`;

    const prompt = `You are an expert procurement evaluator for an international organization (OSS - Observatoire du Sahara et du Sahel). 

Your task is to evaluate a candidate's application against a specific offer's requirements and provide a score from 0 to 100.

## OFFER REQUIREMENTS:
${offerContext}

## CANDIDATE: ${application.full_name}
Country: ${application.applicant_country}
Email: ${application.email}

## CANDIDATE'S DOCUMENTS:
The applicant's PDF documents are attached to this message. For each document, only the first ${MAX_AI_PAGES_PER_DOCUMENT} pages (or the complete document when shorter) are provided.

Documents provided:
${preparedDocuments.map(doc => `- ${doc.documentName}: ${doc.analyzedPageCount} of ${doc.originalPageCount} page(s) analyzed`).join('\n')}
${skippedDocuments.length > 0 ? `\nDocuments unavailable for AI analysis:\n${skippedDocuments.map(name => `- ${name}`).join('\n')}` : ''}

---

Based on the offer requirements and the candidate's submitted documents, evaluate this candidate.

Consider:
1. How well the candidate's qualifications match the offer requirements
2. Relevant experience and expertise demonstrated in their documents
3. Completeness and quality of the application
4. Alignment with the specific role/project requirements described in the TDR

You MUST respond with EXACTLY this JSON format and nothing else:
{"score": <number between 0-100>, "comment": "<brief explanation in French of why this score was given, max 3 sentences>"}`;

    // 4. Call OpenRouter API
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: OPENROUTER_MODEL,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            ...preparedDocuments.map(doc => doc.content)
          ]
        }],
        plugins: [{
          id: 'file-parser',
          pdf: { engine: 'native' }
        }],
        temperature: 0.3,
        max_tokens: 500,
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://oss-online.org',
          'X-Title': 'OSS AI Ranking'
        }
      }
    );

    const content = response.data?.choices?.[0]?.message?.content || '';
    console.log(`AI scoring response for application ${applicationId}:`, content);

    // 5. Parse response
    let score = null;
    let comment = null;

    try {
      // Try to extract JSON from the response (handle markdown code blocks)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        score = typeof parsed.score === 'number' ? Math.min(100, Math.max(0, parsed.score)) : null;
        comment = parsed.comment || null;
      }
    } catch (parseErr) {
      console.error('Failed to parse AI response as JSON:', content);
      // Try to extract just a number as fallback
      const numMatch = content.match(/(\d{1,3})/);
      if (numMatch) {
        score = Math.min(100, Math.max(0, parseInt(numMatch[1])));
        comment = content;
      }
    }

    if (score === null) return;

    // 6. Store in ai_rankings table
    await pool.query(
      `INSERT INTO ai_rankings (application_id, ai_score, ai_comment, ai_scored_at)
       VALUES (?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE ai_score = VALUES(ai_score), ai_comment = VALUES(ai_comment), ai_scored_at = NOW()`,
      [applicationId, score, comment]
    );

    console.log(`AI scoring completed for application ${applicationId}: score=${score}`);

  } catch (err) {
    console.error('AI scoring error for application', applicationId, ':', err.message);
  }
}

// GET endpoint: fetch AI rankings for an offer
app.get('/api/offers/:id/ai-ranking', auth, requireRole(['comite_ajout', 'comite_ouverture']), async (req, res) => {
  try {
    const offerId = req.params.id;

    const [rankings] = await pool.query(`
      SELECT a.id as application_id, a.full_name, a.email, a.applicant_country, a.created_at,
             r.ai_score, r.ai_comment, r.ai_scored_at
      FROM applications a
      LEFT JOIN ai_rankings r ON a.id = r.application_id
      WHERE a.offer_id = ?
      ORDER BY r.ai_score DESC, a.created_at ASC
    `, [offerId]);

    res.json(rankings);
  } catch (err) {
    console.error('Error fetching AI rankings:', err);
    res.status(500).json({ error: 'Failed to fetch AI rankings' });
  }
});

const PORT = 8000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  console.log('Email service: Microsoft Graph API with Outlook');
  console.log(`Email account: ${OUTLOOK_CONFIG.userEmail}`);
});
