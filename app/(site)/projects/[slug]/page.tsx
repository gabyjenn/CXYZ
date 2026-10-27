import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { sanityFetch } from '@/sanity/client'
import { PROJECTS_QUERY } from '@/sanity/queries'
import type { Project } from '@/sanity/types'
import { ProjectDetail } from '@/components/ProjectDetail'

type Props = { params: Promise<{ slug: string }> }

const getProject = async (slug: string) =>
  (await sanityFetch<Project[]>(PROJECTS_QUERY, [])).find((p) => p.slug === slug)

// build every project page ahead of time (new ones are built on first visit)
export async function generateStaticParams() {
  const projects = await sanityFetch<Project[]>(PROJECTS_QUERY, [])
  return projects.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const project = await getProject((await params).slug)
  return project ? { title: project.title } : {}
}

export default async function ProjectPage({ params }: Props) {
  const project = await getProject((await params).slug)
  if (!project) notFound()
  return <ProjectDetail project={project} />
}
