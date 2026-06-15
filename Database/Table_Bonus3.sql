-- Create session_paper_files table to store PDF, Slide, and Text files for papers assigned to sessions
CREATE TABLE IF NOT EXISTS public.session_paper_files (
    file_id SERIAL PRIMARY KEY,
    session_id INT NOT NULL REFERENCES public.sessions(session_id) ON DELETE CASCADE,
    paper_id INT NOT NULL REFERENCES public.papers(paper_id) ON DELETE CASCADE,
    pdf_url TEXT,
    slide_url TEXT,
    text_url TEXT,
    uploaded_by INT REFERENCES public.profiles(user_id) ON DELETE SET NULL,
    uploaded_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_session_paper UNIQUE (session_id, paper_id)
);
