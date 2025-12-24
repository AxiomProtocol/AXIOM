import type { NextApiRequest, NextApiResponse } from 'next';
import { TRAINING_MODULES } from '../../../../lib/organizerTraining';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { id } = req.query;

  const module = TRAINING_MODULES.find(m => m.id === id);
  if (!module) {
    return res.status(404).json({ success: false, error: 'Module not found' });
  }

  return res.status(200).json({
    success: true,
    module: {
      id: module.id,
      title: module.title,
      description: module.description,
      duration: module.duration,
      content: module.content,
      passingScore: module.passingScore,
      questionCount: module.quiz.length,
      quiz: module.quiz.map(q => ({
        id: q.id,
        question: q.question,
        options: q.options
      }))
    }
  });
}
