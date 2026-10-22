// Single source of truth for the portfolio. The 3D space, search, detail panel
// and the readable page view are all generated from these items.
// After editing text here, run `npm run space` to refresh the embeddings.

export type Category = 'genai' | 'production' | 'nlp' | 'mlops' | 'foundations' | 'career';
export type Kind = 'project' | 'role' | 'skill' | 'education' | 'publication' | 'certification';

export interface Link {
    label: string;
    href: string;
}

export interface Item {
    id: string;
    kind: Kind;
    category: Category;
    title: string;
    subtitle?: string;
    dates?: string;
    badge?: string;
    summary: string;
    points?: string[];
    stack?: string[];
    skills?: string[];
    links?: Link[];
    note?: string;
    preview?: string;
    problem?: string;
    flow?: string[];
    featured?: boolean;
}

// Cluster colours, tuned for the dark graphite background
export const CATEGORIES: Record<Category, { label: string; color: string }> = {
    genai: { label: 'GenAI & RAG', color: '#5fb3f6' },
    production: { label: 'Production ML', color: '#3fcf9f' },
    nlp: { label: 'NLP & Research', color: '#ec93c6' },
    mlops: { label: 'Serving & Cloud', color: '#f4c14f' },
    foundations: { label: 'ML Foundations', color: '#ff8b5c' },
    career: { label: 'Career', color: '#b3afa4' }
};

export const PROFILE = {
    name: 'Lingesh S',
    role: 'Data Scientist',
    company: 'DataTracks',
    lede: 'Building production-grade ML and GenAI systems. Specializing in XBRL auto-tagging, RAG architectures, and LLM-powered enterprise solutions.',
    about: [
        "I'm a Data Scientist working at a product-based company, building and deploying production-grade ML and GenAI systems used in real enterprise workflows. My work focuses on turning complex AI models into reliable, scalable features that solve concrete business problems.",
        "At DataTracks, I work on XBRL auto-tagging systems using LSTM and NER models, and design taxonomy-specific ML pipelines across multiple regulatory domains. I've trained and deployed models for newly introduced taxonomies and maintain independent pipelines to support region-specific requirements.",
        "I've also built RAG-based systems for real-time applications, including LLM-powered features inside a Word-like editor. These systems are designed for low-latency inference and production monitoring, using tools like FastAPI, Haystack, RabbitMQ, Grafana, and Prometheus.",
        'My research work has been published at international conferences, and I actively experiment with modern GenAI tooling such as LangChain and retrieval systems to improve how large language models are used in enterprise products.'
    ],
    email: 'lingeshsrinivasan1@gmail.com',
    phone: '+91 72993 07308',
    phoneHref: 'tel:+917299307308',
    github: 'https://github.com/Lingesh-S',
    linkedin: 'https://www.linkedin.com/in/lingesh-s29',
    resume: '/Lingesh_Resume.pdf'
};

const gh = (repo: string): Link => ({ label: 'Source code', href: `https://github.com/Lingesh-S/${repo}` });

export const ITEMS: Item[] = [
    /* ---------------- Experience ---------------- */
    {
        id: 'datatracks',
        kind: 'role',
        category: 'career',
        title: 'Data Scientist',
        subtitle: 'DataTracks',
        dates: 'July 2025 – Present',
        badge: 'Current',
        summary: 'Production ML and GenAI for compliance products: XBRL auto-tagging with LSTM + NER, a RAG-based next-word prediction system, and the services that run them.',
        points: [
            'Built and maintained LSTM + NER-based XBRL auto-tagging models for multiple region-specific taxonomies across core compliance products',
            'Designed independent ML pipelines per taxonomy, and trained & deployed two new taxonomy pipelines end-to-end (data prep → training → production integration)',
            'Developed a RAG-based next-word prediction system for a Word-like editor in a flagship product using Haystack, FastAPI and RabbitMQ',
            'Implemented production monitoring and observability for ML services using Grafana and Prometheus',
            'Deployed and managed ML services in production (on-premise infrastructure) using Docker, FastAPI and REST APIs, ensuring scalable model serving, low-latency inference and reliable system performance'
        ],
        stack: ['LSTM', 'NER', 'XBRL', 'Haystack', 'FastAPI', 'RabbitMQ', 'Docker', 'Grafana', 'Prometheus'],
        skills: ['python', 'lstm', 'ner', 'xbrl-taxonomies', 'haystack', 'rag', 'fastapi', 'rabbitmq', 'docker', 'monitoring']
    },
    {
        id: 'dtyle',
        kind: 'role',
        category: 'career',
        title: 'LLM Intern',
        subtitle: 'Dtyle.AI (IIT Madras Incubated)',
        dates: 'Jan 2025 – June 2025',
        badge: 'Virtual internship',
        summary: 'Large language models and generative AI under the CTO’s mentorship: prompt engineering, fine-tuning, evaluation and RAG architectures.',
        points: [
            'Appointed as a virtual intern to work on Large Language Models and Generative AI',
            "Collaborated with the tech team under the CTO's mentorship on NLP-centric tasks",
            'Contributed to prompt engineering, fine-tuning, and evaluation of LLM-based systems',
            'Engaged in research, experimentation, and practical application of transformer models',
            'Ensured data privacy and responsible AI practices in project workflows',
            'Developed RAG-based architectures using Flan-T5 and LangChain for modular, context-aware Q&A applications'
        ],
        stack: ['LLMs', 'Prompt Engineering', 'Fine-tuning', 'Transformers', 'Flan-T5', 'LangChain', 'RAG'],
        skills: ['python', 'llms', 'prompt-engineering', 'fine-tuning', 'transformers', 'langchain', 'rag']
    },
    {
        id: 'cognibot',
        kind: 'role',
        category: 'career',
        title: 'ML Intern',
        subtitle: 'Cognibot Labs',
        dates: 'June 2024 – Dec 2024',
        badge: 'Internship',
        summary: 'Classical ML and NLP for text analytics: end-to-end pipelines, LDA topic modeling and careful model evaluation.',
        points: [
            'Built end-to-end classical ML pipelines for text analytics using Scikit-learn, including preprocessing, feature engineering, model training, and evaluation',
            'Developed an LDA-based topic modeling system using Gensim & TF-IDF to extract latent topics from large text datasets and improve document clustering',
            'Applied NLP techniques with NLTK, spaCy (tokenization, lemmatization, stopword removal) and trained models like Logistic Regression, Naive Bayes, SVM',
            'Performed model tuning & evaluation using GridSearchCV, Cross-Validation, and metrics like Accuracy, Precision, Recall, F1-score, with data handling via Pandas, NumPy'
        ],
        stack: ['Scikit-learn', 'Gensim', 'LDA', 'TF-IDF', 'NLTK', 'spaCy', 'Pandas', 'NumPy'],
        skills: ['python', 'scikit-learn', 'topic-modeling', 'nlp-toolkits', 'pandas-numpy']
    },

    /* ---------------- Projects ---------------- */
    {
        id: 'xbrl',
        kind: 'project',
        category: 'production',
        title: 'XBRL Auto-Tagging Engine',
        subtitle: 'DataTracks · Production',
        badge: 'In production',
        featured: true,
        summary: 'LSTM + NER models that tag financial statements with XBRL taxonomy concepts across multiple region-specific taxonomies in core compliance products.',
        problem: 'Regulatory filings must tag every reported figure with the correct concept from an XBRL taxonomy. Doing it by hand is slow and error-prone, and each region publishes its own taxonomy with its own rules, so one model does not fit all.',
        points: [
            'Built and maintained LSTM + NER-based XBRL auto-tagging models for multiple region-specific taxonomies across core compliance products',
            'Designed independent ML pipelines per taxonomy, and trained & deployed two new taxonomy pipelines end-to-end (data prep → training → production integration)',
            'Deployed and managed the models as services on on-premise infrastructure using Docker, FastAPI and REST APIs for low-latency inference',
            'Implemented production monitoring and observability for the ML services using Grafana and Prometheus'
        ],
        flow: ['Financial statements', 'Pre-processing', 'LSTM + NER model', 'Per-taxonomy pipeline', 'FastAPI service (Docker)', 'Compliance products'],
        stack: ['Python', 'LSTM', 'NER', 'XBRL', 'Docker', 'FastAPI', 'REST APIs'],
        skills: ['python', 'lstm', 'ner', 'xbrl-taxonomies', 'docker', 'fastapi', 'monitoring'],
        note: 'Proprietary work. The preview uses public IFRS concept names on sample figures.',
        preview: 'xbrl'
    },
    {
        id: 'nextword',
        kind: 'project',
        category: 'production',
        title: 'RAG-Powered Next-Word Prediction',
        subtitle: 'DataTracks · Production',
        badge: 'In production',
        featured: true,
        summary: 'Writing suggestions inside a Word-like editor in a flagship product. Retrieval-augmented, built for low-latency inference and monitored in production.',
        problem: 'Writers in a document editor expect suggestions that are fast and relevant to their domain. Suggestions need to be grounded in domain content and arrive within the rhythm of typing, or they just get in the way.',
        points: [
            'Developed a RAG-based next-word prediction system for a Word-like editor in a flagship product using Haystack, FastAPI and RabbitMQ',
            'Designed for low-latency inference in a real-time, user-facing application',
            'Implemented production monitoring and observability using Grafana and Prometheus',
            'Deployed with Docker on on-premise infrastructure alongside the other ML services'
        ],
        flow: ['Editor context', 'FastAPI + RabbitMQ', 'Haystack retrieval', 'Next-word prediction', 'Inline suggestion', 'Grafana · Prometheus'],
        stack: ['Haystack', 'FastAPI', 'RabbitMQ', 'Grafana', 'Prometheus', 'Docker'],
        skills: ['haystack', 'rag', 'fastapi', 'rabbitmq', 'monitoring', 'docker'],
        note: 'Proprietary work. The preview is a tiny in-browser stand-in over sample annual-report sentences.',
        preview: 'nextword'
    },
    {
        id: 'bedrock',
        kind: 'project',
        category: 'genai',
        title: 'AWS Bedrock RAG Knowledge Assistant',
        subtitle: 'Personal project',
        badge: 'Actively extending',
        featured: true,
        summary: 'A Retrieval-Augmented Generation system built on AWS Bedrock (Titan LLM) and LangChain for context-aware question answering over custom knowledge sources.',
        problem: "General-purpose LLMs don't know your internal documents, and when they guess, they hallucinate. The goal: answers that come only from your own knowledge sources, with retrieval doing the heavy lifting and sources you can check.",
        points: [
            'Designed a RAG system using AWS Bedrock (Titan LLM) and LangChain, enabling context-aware question answering over custom knowledge sources',
            'Built a data pipeline to ingest, chunk, and embed documents using Amazon Titan Embeddings, storing vectors in ChromaDB for efficient semantic search and retrieval',
            'Integrated the retrieval + generation workflow to provide accurate, grounded responses, significantly reducing hallucinations in LLM-based applications',
            'Developed a real-time Streamlit interface; currently extending it with AWS S3 for scalable storage and EC2-based deployment for production readiness'
        ],
        flow: ['Documents', 'Chunking', 'Titan Embeddings', 'ChromaDB', 'LangChain retriever', 'Titan LLM on Bedrock', 'Streamlit UI'],
        stack: ['AWS Bedrock', 'Titan LLM', 'Titan Embeddings', 'LangChain', 'ChromaDB', 'Streamlit', 'Python'],
        skills: ['python', 'aws-bedrock', 'langchain', 'vector-db', 'rag', 'llms', 'streamlit', 'aws'],
        links: [gh('aws-bedrock-rag-knowledge-assistant')],
        preview: 'bedrock'
    },
    {
        id: 'codebase',
        kind: 'project',
        category: 'genai',
        title: 'Codebase RAG Assistant',
        subtitle: 'Personal project',
        featured: true,
        summary: 'Ask questions about a codebase in plain English. A RAG system that pairs Mistral-7B (built on PyTorch) with semantic search over a vector store for code understanding and explanation.',
        problem: 'Getting up to speed on an unfamiliar codebase means hours of grepping and reading. This assistant lets developers ask "where" and "how" questions in plain English and get answers grounded in the actual source files.',
        points: [
            'Designed a RAG system that answers questions about code using Mistral-7B built on PyTorch, combining transformer-based generation with semantic search from a vector store',
            'Built a pipeline to load and chunk .py, .md and .json files, then embed them with SentenceTransformers and store them in a Chroma/FAISS vector database for high-precision code retrieval',
            'Integrated LangChain, Mistral-7B, ChromaDB and Streamlit to deliver real-time code understanding, explanation, and developer support via a modular assistant'
        ],
        flow: ['.py · .md · .json files', 'Loaders & chunker', 'SentenceTransformers', 'Chroma / FAISS', 'LangChain retriever (k = 3)', 'Mistral-7B', 'Streamlit'],
        stack: ['Mistral-7B', 'PyTorch', 'LangChain', 'SentenceTransformers', 'ChromaDB', 'FAISS', 'Streamlit'],
        skills: ['python', 'langchain', 'sentence-transformers', 'vector-db', 'rag', 'llms', 'pytorch', 'transformers', 'streamlit'],
        note: 'The repository is private. Source available on request.',
        preview: 'codebase'
    },
    {
        id: 'lda',
        kind: 'project',
        category: 'nlp',
        title: 'LDA-Powered Resume Screening Dashboard',
        subtitle: 'Research · ICCCAI-2024',
        badge: 'Published at ICCCAI-2024',
        featured: true,
        summary: "Presented at ICCCAI-2024 (Taylor's University, Malaysia). An interactive Streamlit dashboard that uses LDA to surface dominant topics and keywords from resumes and match them to roles.",
        problem: 'Recruiters screen large volumes of resumes by hand. This research explores how topic modeling can surface what a resume is really about, match it to a role, and then help the recruiter prepare for the interview.',
        points: [
            'Developed an interactive Streamlit dashboard using LDA (Latent Dirichlet Allocation), implemented with Scikit-learn, for extracting dominant topics and keywords from resumes',
            'Designed a custom NLP-based job matching algorithm with token indexing, achieving >80% accuracy in simulated resume screenings',
            'Integrated the OpenAI API to auto-generate personalized interview questions, enhancing recruiter productivity through AI-powered automation'
        ],
        flow: ['Resumes', 'Pre-processing & token indexing', 'LDA topic model', 'Job-matching score', 'OpenAI question generation', 'Streamlit dashboard'],
        stack: ['Python', 'LDA', 'Scikit-learn', 'NLP', 'OpenAI API', 'Streamlit'],
        skills: ['python', 'topic-modeling', 'scikit-learn', 'streamlit', 'llms'],
        links: [gh('lda-resume-screening-dashboard')],
        preview: 'lda'
    },
    {
        id: 'noteninja',
        kind: 'project',
        category: 'genai',
        title: 'NoteNinja AI: Learning Chatbot',
        subtitle: 'Personal project',
        featured: true,
        summary: 'A personalized learning assistant that lets students talk to their own lecture notes, PDFs and quizzes. Built with LangChain and Flan-T5 for real-time, context-aware Q&A.',
        problem: "Students learn best when answers come from their own course material, not the open web. NoteNinja answers questions grounded in each student's notes, like a private tutor.",
        points: [
            'Developed and deployed a personalized learning chatbot for students using LangChain and Flan-T5, enabling real-time, context-aware Q&A from academic notes',
            'LangChain orchestrates document loaders, retrievers and the LLM; Hugging Face Flan-T5 handles natural language understanding',
            'PDF and text parsing for academic notes and quizzes, with an interactive Streamlit front end'
        ],
        flow: ['Notes & PDFs', 'Document loaders', 'LangChain retriever', 'Flan-T5', 'Streamlit chat'],
        stack: ['LangChain', 'Flan-T5', 'Hugging Face', 'Streamlit'],
        skills: ['python', 'langchain', 'llms', 'transformers', 'huggingface', 'streamlit', 'rag'],
        links: [{ label: 'Repository', href: 'https://github.com/Lingesh-S/NoteNinja-AI' }],
        note: 'The public repository is being rebuilt, so some source files are temporarily unavailable.',
        preview: 'noteninja'
    },
    {
        id: 'agents',
        kind: 'project',
        category: 'genai',
        title: 'Multi-Agent Blog Generator',
        subtitle: 'Personal project',
        summary: 'A LangGraph system that orchestrates Researcher, Writer and Editor agents to research a topic and turn it into an edited blog post.',
        points: [
            'Researcher, Writer and Editor agents coordinated with LangGraph, with iterative editing and configurable audience, tone and length',
            'Web search via DuckDuckGo, Serper or Tavily with a TTL cache; drafting with Ollama or OpenAI behind a provider abstraction',
            'Ships with a web dashboard, REST API (FastAPI), CLI, Docker setup and optional Prometheus metrics'
        ],
        stack: ['LangGraph', 'FastAPI', 'Ollama', 'OpenAI', 'Docker', 'Prometheus'],
        skills: ['python', 'langgraph', 'llms', 'fastapi', 'docker', 'monitoring'],
        links: [gh('multi-agent-blog-generator')]
    },
    {
        id: 'mcq-lora',
        kind: 'project',
        category: 'genai',
        title: 'MCQ Generator: Mistral-7B + LoRA',
        subtitle: 'Personal project',
        summary: 'Fine-tuned Mistral-7B-Instruct with LoRA adapters to generate multiple-choice questions from academic paragraphs. Model published on Hugging Face.',
        points: [
            'LoRA fine-tuning of Mistral-7B-Instruct (r = 8, alpha = 32) in 8-bit with bitsandbytes and PEFT',
            'Trained on ~500 paragraph → MCQ examples for 3 epochs',
            'Inference notebook and model card published on the Hugging Face Hub'
        ],
        stack: ['Mistral-7B', 'LoRA', 'PEFT', 'bitsandbytes', 'Transformers'],
        skills: ['fine-tuning', 'transformers', 'huggingface', 'pytorch', 'llms'],
        links: [gh('mcq-mistral-lora'), { label: 'Model card', href: 'https://huggingface.co/Lingesh-S/mcq-mistral-lora' }]
    },
    {
        id: 'tamil-ft',
        kind: 'project',
        category: 'genai',
        title: 'Fine-Tuning LLMs for Tamil Stories',
        subtitle: 'Personal project',
        summary: 'A two-part fine-tuning experiment: a baseline with the Hugging Face Trainer, then parameter-efficient LoRA fine-tuning of distilgpt2 on a Tamil story dataset.',
        points: [
            'Baseline fine-tuning with the Hugging Face Trainer API',
            'LoRA (PEFT) fine-tuning of distilgpt2 for creative Tamil story generation',
            'Dataset preparation, tokenization and model saving in a Colab workflow'
        ],
        stack: ['Transformers', 'LoRA', 'PEFT', 'Datasets'],
        skills: ['fine-tuning', 'transformers', 'huggingface', 'llms'],
        links: [gh('fine-tuning-llm')]
    },
    {
        id: 'lungai',
        kind: 'project',
        category: 'foundations',
        title: 'LungAI: Chest X-ray Classification',
        subtitle: 'Personal project',
        summary: 'A CNN classifier for chest X-rays (Normal vs Pneumonia) with Grad-CAM explainability and an optional Streamlit app for real-time predictions.',
        points: [
            'Custom CNN and transfer-learning variants trained with TensorFlow / Keras',
            'Grad-CAM visualisations to explain predictions',
            'Evaluated with accuracy, precision, recall, F1 and confusion matrices'
        ],
        stack: ['TensorFlow', 'Keras', 'OpenCV', 'Grad-CAM', 'Streamlit'],
        skills: ['tensorflow', 'python', 'streamlit', 'pandas-numpy'],
        links: [gh('xray-diagnosis-cnn')]
    },
    {
        id: 'carsales',
        kind: 'project',
        category: 'foundations',
        title: 'Car Sales Analytics',
        subtitle: 'Personal project',
        summary: 'End-to-end analysis of car sales data: cleaning and EDA in Python, KPI queries in SQL, and interactive Power BI dashboards.',
        points: [
            'Data cleaning and exploratory analysis with Pandas and NumPy',
            'SQL queries for KPIs such as total sales, average price and top dealers',
            'Power BI dashboards for regional revenue, dealer performance and customer demographics'
        ],
        stack: ['Python', 'SQL', 'Pandas', 'Power BI'],
        skills: ['python', 'pandas-numpy'],
        links: [gh('car-sales-analytics')]
    },

    /* ---------------- Education, research, certifications ---------------- */
    {
        id: 'education',
        kind: 'education',
        category: 'career',
        title: 'B.E. Computer Science Engineering',
        subtitle: 'Sathyabama University, Chennai',
        dates: '2020 – 2024',
        badge: 'CGPA 8.41',
        summary: 'Bachelor of Engineering in Computer Science (full-time), graduated with a CGPA of 8.41 / 10.'
    },
    {
        id: 'publication',
        kind: 'publication',
        category: 'nlp',
        title: 'Published Research Paper',
        subtitle: 'ICCCAI-2024 · Taylor’s University, Malaysia',
        dates: '2024',
        summary: 'Published and presented "LDA-Powered Resume Screening Dashboard with Token Indexing & Streamlit" at ICCCAI-2024, in association with Taylor’s University, Malaysia.',
        skills: ['topic-modeling', 'scikit-learn', 'streamlit']
    },
    {
        id: 'cert-ml',
        kind: 'certification',
        category: 'career',
        title: 'Machine Learning Internship',
        subtitle: 'Cognibot Labs',
        summary: 'Certificate for the machine learning internship at Cognibot Labs.'
    },
    {
        id: 'cert-oracle',
        kind: 'certification',
        category: 'career',
        title: 'Cloud Data Management Associate',
        subtitle: 'Oracle',
        summary: 'Oracle certification in cloud data management.'
    },
    {
        id: 'cert-accenture',
        kind: 'certification',
        category: 'career',
        title: 'Data Analytics Virtual Experience',
        subtitle: 'Accenture',
        summary: 'Accenture virtual experience programme in data analytics.'
    },

    /* ---------------- Skills ---------------- */
    skill('rag', 'genai', 'RAG Systems', 'Retrieval-Augmented Generation: grounding LLM answers in retrieved documents to cut hallucinations, from real-time production systems to knowledge and code assistants.'),
    skill('llms', 'genai', 'LLMs', 'Large language models in applications: Mistral-7B, Flan-T5, Titan, Llama and OpenAI models for generation, Q&A and agents.'),
    skill('langchain', 'genai', 'LangChain', 'LangChain for orchestrating loaders, retrievers, chains and LLMs in RAG assistants and chatbots.'),
    skill('langgraph', 'genai', 'LangGraph', 'LangGraph for multi-agent workflows that coordinate researcher, writer and editor agents.'),
    skill('haystack', 'genai', 'Haystack', 'Haystack pipelines for retrieval in a production next-word prediction system.'),
    skill('prompt-engineering', 'genai', 'Prompt Engineering', 'Designing and evaluating prompts for LLM-based systems.'),
    skill('aws-bedrock', 'genai', 'AWS Bedrock', 'AWS Bedrock with Titan LLM and Titan Embeddings for managed generative AI.'),
    skill('huggingface', 'genai', 'Hugging Face', 'Hugging Face Hub, Transformers and Datasets for loading, fine-tuning and publishing models.'),
    skill('sentence-transformers', 'genai', 'SentenceTransformers', 'Sentence embedding models for semantic search over documents and code.'),
    skill('vector-db', 'genai', 'ChromaDB & FAISS', 'Vector databases for storing embeddings and running fast similarity search.'),
    skill('fine-tuning', 'genai', 'Fine-tuning · LoRA · PEFT', 'Parameter-efficient fine-tuning of LLMs with LoRA adapters, PEFT and 8-bit training.'),
    skill('lstm', 'production', 'LSTM', 'LSTM sequence models for tagging financial statement text in production.'),
    skill('ner', 'production', 'NER', 'Named entity recognition for extracting and labelling concepts in financial documents.'),
    skill('xbrl-taxonomies', 'production', 'XBRL', 'XBRL taxonomies and tagging for regulatory financial reporting across regions.'),
    skill('transformers', 'nlp', 'Transformers', 'Transformer models for NLP: encoders for embeddings and decoders for generation.'),
    skill('nlp-toolkits', 'nlp', 'NLTK & spaCy', 'Tokenization, lemmatization and stopword removal with NLTK and spaCy.'),
    skill('topic-modeling', 'nlp', 'LDA · Gensim · TF-IDF', 'Topic modeling with LDA, Gensim and TF-IDF to extract latent topics from text.'),
    skill('fastapi', 'mlops', 'FastAPI & REST APIs', 'FastAPI services and REST APIs for serving ML models with low latency.'),
    skill('rabbitmq', 'mlops', 'RabbitMQ', 'Message queues for request handling in real-time ML systems.'),
    skill('docker', 'mlops', 'Docker', 'Containerised deployment of ML services on on-premise infrastructure.'),
    skill('monitoring', 'mlops', 'Grafana & Prometheus', 'Monitoring and observability for production ML services.'),
    skill('aws', 'mlops', 'AWS', 'AWS cloud: S3, SageMaker, Lambda, EC2, Glue and Athena.'),
    skill('big-data', 'mlops', 'PySpark & Kafka', 'Big data processing with Apache Spark (PySpark) and streaming with Apache Kafka.'),
    skill('python', 'foundations', 'Python & SQL', 'Python and SQL, the core languages behind every pipeline, model and service.'),
    skill('pytorch', 'foundations', 'PyTorch', 'PyTorch for deep learning and running transformer models.'),
    skill('tensorflow', 'foundations', 'TensorFlow & Keras', 'TensorFlow and Keras for deep learning, including CNNs for medical imaging.'),
    skill('scikit-learn', 'foundations', 'Scikit-learn', 'Classical ML with Scikit-learn: pipelines, GridSearchCV, cross-validation and evaluation.'),
    skill('pandas-numpy', 'foundations', 'Pandas & NumPy', 'Data wrangling and analysis with Pandas and NumPy.'),
    skill('streamlit', 'foundations', 'Streamlit', 'Streamlit for interactive ML dashboards and demos.')
];

function skill(id: string, category: Category, title: string, summary: string): Item {
    return { id, kind: 'skill', category, title, summary };
}

export const ITEM_BY_ID: Record<string, Item> = Object.fromEntries(ITEMS.map((item) => [item.id, item]));

// Where each skill is used, derived from the `skills` lists above
export function usedIn(skillId: string): Item[] {
    return ITEMS.filter((item) => item.kind !== 'skill' && item.skills?.includes(skillId));
}

// Text that represents an item for embeddings and keyword search
export function itemText(item: Item): string {
    const used = item.kind === 'skill' ? usedIn(item.id).map((u) => u.title) : [];
    return [
        item.title,
        item.subtitle,
        item.summary,
        ...(item.points || []),
        item.stack?.join(', '),
        used.length ? `Used in: ${used.join(', ')}` : ''
    ].filter(Boolean).join('. ');
}
