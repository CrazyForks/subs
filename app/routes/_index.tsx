import type { MetaFunction } from '@remix-run/node'
import { json } from '@remix-run/react'
import { Download, Upload } from 'lucide-react'
import type React from 'react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import AddSubscriptionModal from '~/components/AddSubscriptionModal'
import AnnouncementBar from '~/components/AnnouncementBar'
import DeleteConfirmationDialog from '~/components/DeleteConfirmationDialog'
import Header from '~/components/Header'
import Hero from '~/components/Hero'
import SearchBar from '~/components/SearchBar'
import SubscriptionGrid from '~/components/SubscriptionGrid'
import Summary from '~/components/Summary'
import { Button } from '~/components/ui/button'
import { cronJobsResults } from '~/entry.server'
import useSubscriptionStore, { type Subscription } from '~/store/subscriptionStore'

export const meta: MetaFunction = () => {
  return [{ title: 'Subs - Subscription Tracker' }, { name: 'description', content: 'Easily track your subscriptions' }]
}
export async function loader() {
  return json({
    rates: cronJobsResults.rates,
    lastUpdatd: cronJobsResults.updated,
  })
}

export default function Index() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [subscriptionToDelete, setSubscriptionToDelete] = useState<Subscription | null>(null)
  const [enableKodu, setEnableKodu] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const {
    subscriptions,
    addSubscription,
    editSubscription,
    deleteSubscription,
    exportSubscriptions,
    importSubscriptions,
  } = useSubscriptionStore()

  useEffect(() => {
    if (typeof window !== 'undefined' && window.ENV.SHOW_KODU_BANNER) {
      setEnableKodu(true)
    }
  }, [])

  const handleAddSubscription = () => {
    setEditingSubscription(null)
    setIsModalOpen(true)
  }

  const handleEditSubscription = (id: string) => {
    const subscription = subscriptions.find((sub) => sub.id === id)
    if (subscription) {
      setEditingSubscription(subscription)
      setIsModalOpen(true)
    }
  }

  const handleDeleteSubscription = (id: string) => {
    const subscription = subscriptions.find((sub) => sub.id === id)
    if (subscription) {
      setSubscriptionToDelete(subscription)
      setIsDeleteDialogOpen(true)
    }
  }

  const confirmDelete = () => {
    if (subscriptionToDelete) {
      deleteSubscription(subscriptionToDelete.id)
      toast.success('Subscription deleted successfully.')
      setIsDeleteDialogOpen(false)
      setSubscriptionToDelete(null)
    }
  }

  const handleSaveSubscription = (subscription: Omit<Subscription, 'id'>) => {
    try {
      if (editingSubscription) {
        editSubscription(editingSubscription.id, subscription)
        toast.success(`${subscription.name} updated successfully.`)
      } else {
        addSubscription(subscription)
        toast.success(`${subscription.name} added successfully.`)
      }
      setIsModalOpen(false)
    } catch (error) {
      toast.error('Failed to save subscription. Please try again.')
    }
  }

  const handleExport = async () => {
    try {
      const data = await exportSubscriptions()
      const blob = new Blob([data], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'subscriptions.json'
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`${subscriptions.length} subscriptions exported successfully.`)
    } catch (error) {
      console.error('Export failed:', error)
      toast.error('Failed to export subscriptions. Please try again.')
    }
  }

  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string
          importSubscriptions(content)
          toast.success('Subscriptions imported successfully.')
        } catch (error) {
          console.error('Import failed:', error)
          toast.error('Failed to import subscriptions. Please check the file and try again.')
        }
      }
      reader.readAsText(file)
    }
  }

  const calculateTotals = () => {
    return subscriptions.reduce((acc: { [key: string]: number }, sub) => {
      acc[sub.currency] = (acc[sub.currency] || 0) + sub.price
      return acc
    }, {})
  }

  const filteredSubscriptions = subscriptions.filter(
    (sub) =>
      sub.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.domain.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div className="min-h-screen bg-background">
      {enableKodu && <AnnouncementBar />}
      <Header onAddSubscription={handleAddSubscription} />
      <main className="container mx-auto py-6 px-3 sm:px-4 lg:px-6">
        <Hero />
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-center">
          <h2 className="text-xl font-bold text-foreground mb-3 sm:mb-0">
            Manage {subscriptions.length} Subscriptions
          </h2>
          <div className="flex space-x-2">
            <Button onClick={handleExport} className="bg-primary hover:bg-primary/80 text-primary-foreground text-sm">
              <Download className="mr-1 h-3 w-3" />
              Export
            </Button>
            <Button
              onClick={handleImportClick}
              className="bg-primary hover:bg-primary/80 text-primary-foreground text-sm"
            >
              <Upload className="mr-1 h-3 w-3" />
              Import
            </Button>
            <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
          </div>
        </div>
        <Summary totals={calculateTotals()} />
        <div className="mb-4">
          <SearchBar onSearch={setSearchQuery} />
        </div>
        <SubscriptionGrid
          subscriptions={filteredSubscriptions}
          onEditSubscription={handleEditSubscription}
          onDeleteSubscription={handleDeleteSubscription}
        />
      </main>
      <AddSubscriptionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveSubscription}
        editingSubscription={editingSubscription}
      />
      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        subscriptionName={subscriptionToDelete?.name || ''}
      />
    </div>
  )
}
